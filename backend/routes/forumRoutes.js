module.exports = function registerForumRoutes(app, { admin, db }) {
// Forum Routes
/**
 * @route   POST /api/forums
 * @desc    Create a new forum discussion thread
 * @access  Public
 */
app.post('/api/forums', async (req, res) => {
  try {
    const { title, content, category, creatorId } = req.body;
    
    const newPost = {
      title,
      content,
      category,
      creatorId,
      likes: [], // Array to track upvote UIDs
      bookmarks: [], // Array to track save/bookmark UIDs
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('forums').add(newPost);
    return res.status(201).json({ status: 'success', data: { id: docRef.id, ...newPost } });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @route   GET /api/forums
 * @desc    Fetch all forum posts populated with author profiles
 * @access  Public
 */
app.get('/api/forums', async (req, res) => {
  try {
    const { category } = req.query; 
    const snapshot = await db.collection('forums').get();
    let forums = [];

    snapshot.forEach(doc => {
      forums.push({ id: doc.id, ...doc.data() });
    });

    if (category && category !== 'All Topics') {
      forums = forums.filter(post => post.category === category);
    }

    // Sort by newest first
    forums.sort((a, b) => {
      const timeA = (a.createdAt && typeof a.createdAt.toMillis === 'function') ? a.createdAt.toMillis() : 0;
      const timeB = (b.createdAt && typeof b.createdAt.toMillis === 'function') ? b.createdAt.toMillis() : 0;
      return timeB - timeA; 
    });

    // Hydrate each post with the creator's real name and avatar
    const hydratedForums = await Promise.all(forums.map(async (post) => {
      try {
        const creatorDoc = await db.collection('users').doc(post.creatorId).get();
        const creatorData = creatorDoc.exists ? creatorDoc.data() : null;
        
        // Fetch comment count for UI metrics
        const commentsSnapshot = await db.collection('forums').doc(post.id).collection('comments').get();

        return { 
          ...post, 
          creatorName: creatorData?.name || 'NUS Student',
          creatorPicUrl: creatorData?.profilePicUrl || '',
          commentCount: commentsSnapshot.size // Number of comments
        };
      } catch (err) {
        return { ...post, creatorName: 'NUS Student', creatorPicUrl: '', commentCount: 0 };
      }
    }));

    return res.status(200).json({ status: 'success', data: hydratedForums });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

/**
 * @route   PUT /api/forums/:postId/toggle-like
 * @desc    Add or remove user from likes array
 * @access  Public
 */
app.put('/api/forums/:postId/toggle-like', async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;

  try {
    const postRef = db.collection('forums').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) return res.status(404).json({ status: 'error', message: 'Post not found.' });

    const likes = postDoc.data().likes || [];
    const isLiked = likes.includes(userId);

    await postRef.update({
      likes: isLiked 
        ? admin.firestore.FieldValue.arrayRemove(userId)
        : admin.firestore.FieldValue.arrayUnion(userId)
    });

    return res.status(200).json({ status: 'success', message: 'Like toggled' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @route   PUT /api/forums/:postId/toggle-bookmark
 * @desc    Add or remove user from bookmarks array
 * @access  Public
 */
app.put('/api/forums/:postId/toggle-bookmark', async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;

  try {
    const postRef = db.collection('forums').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) return res.status(404).json({ status: 'error', message: 'Post not found.' });

    const bookmarks = postDoc.data().bookmarks || [];
    const isBookmarked = bookmarks.includes(userId);

    await postRef.update({
      bookmarks: isBookmarked 
        ? admin.firestore.FieldValue.arrayRemove(userId)
        : admin.firestore.FieldValue.arrayUnion(userId)
    });

    return res.status(200).json({ status: 'success', message: 'Bookmark toggled' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @route   GET /api/forums/:postId
 * @desc    Fetch details for a single forum post
 * @access  Public
 */
app.get('/api/forums/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const doc = await db.collection('forums').doc(postId).get();
    
    if (!doc.exists) return res.status(404).json({ status: 'error', message: 'Post not found.' });
    
    const postData = doc.data();
    let creatorName = 'NUS Student';
    let creatorPicUrl = '';

    // Hydrate author info
    try {
      const userDoc = await db.collection('users').doc(postData.creatorId).get();
      if (userDoc.exists) {
        creatorName = userDoc.data().name || 'NUS Student';
        creatorPicUrl = userDoc.data().profilePicUrl || '';
      }
    } catch (err) { console.error('Author hydration failed', err); }

    return res.status(200).json({ 
      status: 'success', 
      data: { id: doc.id, ...postData, creatorName, creatorPicUrl } 
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @route   GET /api/forums/:postId/comments
 * @desc    Fetch all comments for a specific post
 * @access  Public
 */
app.get('/api/forums/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const snapshot = await db.collection('forums').doc(postId).collection('comments')
                             .orderBy('createdAt', 'asc').get(); // Oldest first for comments
    
    let comments = [];
    snapshot.forEach(doc => { comments.push({ id: doc.id, ...doc.data() }); });

    // Hydrate each comment with user details
    const hydratedComments = await Promise.all(comments.map(async (comment) => {
      try {
        const userDoc = await db.collection('users').doc(comment.userId).get();
        return { 
          ...comment, 
          userName: userDoc.exists ? (userDoc.data().name || 'NUS Student') : 'NUS Student',
          userPicUrl: userDoc.exists ? (userDoc.data().profilePicUrl || '') : ''
        };
      } catch (err) { return { ...comment, userName: 'NUS Student', userPicUrl: '' }; }
    }));

    return res.status(200).json({ status: 'success', data: hydratedComments });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @route   POST /api/forums/:postId/comments
 * @desc    Add a new comment to a post
 * @access  Public
 */
app.post('/api/forums/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, text } = req.body;

    const newComment = {
      userId,
      text,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const commentRef = await db.collection('forums').doc(postId).collection('comments').add(newComment);
    
    return res.status(201).json({ status: 'success', data: { id: commentRef.id, ...newComment } });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @route   PUT /api/forums/:postId
 * @desc    Edit an existing forum post
 */
app.put('/api/forums/:postId', async (req, res) => {
  const { postId } = req.params;
  const { userId, title, category, content } = req.body;
  try {
    const postRef = db.collection('forums').doc(postId);
    const doc = await postRef.get();
    if (!doc.exists) return res.status(404).json({ status: 'error', message: 'Post not found.' });
    if (doc.data().creatorId !== userId) return res.status(403).json({ status: 'error', message: 'Unauthorized' });

    await postRef.update({
      title, category, content,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return res.status(200).json({ status: 'success', message: 'Post updated' });
  } catch (error) { return res.status(500).json({ status: 'error', message: error.message }); }
});

/**
 * @route   DELETE /api/forums/:postId
 * @desc    Delete a forum post
 */
app.delete('/api/forums/:postId', async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;
  try {
    const postRef = db.collection('forums').doc(postId);
    const doc = await postRef.get();
    if (!doc.exists) return res.status(404).json({ status: 'error', message: 'Post not found.' });
    if (doc.data().creatorId !== userId) return res.status(403).json({ status: 'error', message: 'Unauthorized' });

    await postRef.delete();
    return res.status(200).json({ status: 'success', message: 'Post deleted' });
  } catch (error) { return res.status(500).json({ status: 'error', message: error.message }); }
});

/**
 * @route   PUT /api/forums/:postId/comments/:commentId
 * @desc    Edit a specific comment
 */
app.put('/api/forums/:postId/comments/:commentId', async (req, res) => {
  const { postId, commentId } = req.params;
  const { userId, text } = req.body;
  try {
    const commentRef = db.collection('forums').doc(postId).collection('comments').doc(commentId);
    const doc = await commentRef.get();
    if (!doc.exists) return res.status(404).json({ status: 'error', message: 'Comment not found.' });
    if (doc.data().userId !== userId) return res.status(403).json({ status: 'error', message: 'Unauthorized' });

    await commentRef.update({ text, isEdited: true });
    return res.status(200).json({ status: 'success', message: 'Comment updated' });
  } catch (error) { return res.status(500).json({ status: 'error', message: error.message }); }
});

/**
 * @route   DELETE /api/forums/:postId/comments/:commentId
 * @desc    Delete a specific comment
 */
app.delete('/api/forums/:postId/comments/:commentId', async (req, res) => {
  const { postId, commentId } = req.params;
  const { userId } = req.body;
  try {
    const commentRef = db.collection('forums').doc(postId).collection('comments').doc(commentId);
    const doc = await commentRef.get();
    if (!doc.exists) return res.status(404).json({ status: 'error', message: 'Comment not found.' });
    if (doc.data().userId !== userId) return res.status(403).json({ status: 'error', message: 'Unauthorized' });

    await commentRef.delete();
    return res.status(200).json({ status: 'success', message: 'Comment deleted' });
  } catch (error) { return res.status(500).json({ status: 'error', message: error.message }); }
});

/**
 * @route   PUT /api/forums/:postId/comments/:commentId/toggle-like
 * @desc    Add or remove user from a specific comment's likes array
 */
app.put('/api/forums/:postId/comments/:commentId/toggle-like', async (req, res) => {
  const { postId, commentId } = req.params;
  const { userId } = req.body;
  try {
    const commentRef = db.collection('forums').doc(postId).collection('comments').doc(commentId);
    const doc = await commentRef.get();
    
    if (!doc.exists) return res.status(404).json({ status: 'error', message: 'Comment not found.' });

    const likes = doc.data().likes || [];
    const isLiked = likes.includes(userId);

    // Toggle logic: if already liked, remove. If not, add.
    await commentRef.update({
      likes: isLiked 
        ? admin.firestore.FieldValue.arrayRemove(userId)
        : admin.firestore.FieldValue.arrayUnion(userId)
    });

    return res.status(200).json({ status: 'success', message: 'Comment like toggled' });
  } catch (error) { 
    return res.status(500).json({ status: 'error', message: error.message }); 
  }
});
};
