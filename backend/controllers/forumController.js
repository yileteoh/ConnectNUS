const { admin, db } = require('../config/firebase');
const badgeService = require('../utils/badgeService');
const pointsService = require('../utils/pointsService');

// Create a new forum discussion thread
exports.createPost = async (req, res) => {
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

    // Award points for creating a forum post
    try {
      await pointsService.awardPoints(creatorId, 'forumPostCreated');
    } catch (e) { console.error('awardPoints (forum post created) failed:', e); }

    return res.status(201).json({ status: 'success', data: { id: docRef.id, ...newPost } });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// Fetch all forum posts populated with author profiles
exports.getPosts = async (req, res) => {
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
};

// Add or remove user from likes array
exports.toggleLike = async (req, res) => {
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

    // Award progress toward the Popular Poster badge and points when a like is newly added (not removed).
    if (!isLiked) {
      try {
        await badgeService.awardProgress(postDoc.data().creatorId, 'likesReceived');
      } catch (e) { console.error('awardProgress (post like) failed:', e); }
      try {
        await pointsService.awardPoints(postDoc.data().creatorId, 'likeReceived');
      } catch (e) { console.error('awardPoints (post like) failed:', e); }
    }

    return res.status(200).json({ status: 'success', message: 'Like toggled' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// Add or remove user from bookmarks array
exports.toggleBookmark = async (req, res) => {
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
};

// Fetch details for a single forum post
exports.getPostById = async (req, res) => {
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
};

// Fetch all comments for a specific post
exports.getComments = async (req, res) => {
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
};

// Add a new comment to a post
exports.createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, text } = req.body;

    const newComment = {
      userId,
      text,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const commentRef = await db.collection('forums').doc(postId).collection('comments').add(newComment);

    // Award points for creating a forum comment
    try {
      await pointsService.awardPoints(userId, 'forumCommentCreated');
    } catch (e) { console.error('awardPoints (forum comment created) failed:', e); }

    return res.status(201).json({ status: 'success', data: { id: commentRef.id, ...newComment } });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// Edit an existing forum post
exports.updatePost = async (req, res) => {
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
};

// Delete a forum post
exports.deletePost = async (req, res) => {
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
};

// Edit a specific comment
exports.updateComment = async (req, res) => {
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
};

// Delete a specific comment
exports.deleteComment = async (req, res) => {
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
};

// Add or remove user from a specific comment's likes array
exports.toggleCommentLike = async (req, res) => {
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

    // Award progress toward the Popular Poster badge and points when a like is newly added (not removed).
    if (!isLiked) {
      try {
        await badgeService.awardProgress(doc.data().userId, 'likesReceived');
      } catch (e) { console.error('awardProgress (comment like) failed:', e); }
      try {
        await pointsService.awardPoints(doc.data().userId, 'likeReceived');
      } catch (e) { console.error('awardPoints (comment like) failed:', e); }
    }

    return res.status(200).json({ status: 'success', message: 'Comment like toggled' });
  } catch (error) { 
    return res.status(500).json({ status: 'error', message: error.message }); 
  }
};
