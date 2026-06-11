const { admin, db } = require('../config/firebase');

// Get Personalized Recommendations (Prioritize same faculty)
const getRecommendations = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Fetch current user to get their faculty
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    
    const myFaculty = userDoc.data().faculty || '';
    const myBuddy = userDoc.data().currentBuddyId || null;

    // Fetch all students
    const snapshot = await db.collection('users').get();
    let recommendations = [];

    snapshot.forEach(doc => {
      const userData = doc.data();
      // Exclude self, exclude people who already have a buddy, and exclude my current buddy
      if (doc.id !== userId && !userData.currentBuddyId) {
        recommendations.push({
          id: doc.id,
          ...userData,
          // Calculate a matching score: same faculty = higher score
          matchScore: userData.faculty === myFaculty ? 1 : 0
        });
      }
    });

    // Sort by match score descending (Same faculty comes first)
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    return res.status(200).json({ status: 'success', data: recommendations });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// Send a Buddy Request
const sendBuddyRequest = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    // Check if either already has a buddy (1-on-1 Rule)
    const senderDoc = await db.collection('users').doc(senderId).get();
    const receiverDoc = await db.collection('users').doc(receiverId).get();

    if (senderDoc.data().currentBuddyId) return res.status(400).json({ error: 'You already have a buddy.' });
    if (receiverDoc.data().currentBuddyId) return res.status(400).json({ error: 'This person already has a buddy.' });

    // Create pending request
    await db.collection('buddyRequests').add({
      senderId,
      receiverId,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(201).json({ status: 'success', message: 'Request sent!' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// Accept a Buddy Request (Enforce 1-on-1 rule securely)
const acceptBuddyRequest = async (req, res) => {
  try {
    const { requestId, senderId, receiverId } = req.body;

    await db.runTransaction(async (transaction) => {
      const senderRef = db.collection('users').doc(senderId);
      const receiverRef = db.collection('users').doc(receiverId);
      
      const senderDoc = await transaction.get(senderRef);
      const receiverDoc = await transaction.get(receiverRef);

      // Double check: if someone accepted another request a second ago, abort.
      if (senderDoc.data().currentBuddyId || receiverDoc.data().currentBuddyId) {
        throw new Error("One of the users already has a buddy.");
      }

      // Bind them together!
      transaction.update(senderRef, { currentBuddyId: receiverId });
      transaction.update(receiverRef, { currentBuddyId: senderId });

      // Mark request as accepted
      const requestRef = db.collection('buddyRequests').doc(requestId);
      transaction.update(requestRef, { status: 'accepted' });
    });

    return res.status(200).json({ status: 'success', message: 'Buddy accepted! You are now locked 1-on-1.' });
  } catch (error) {
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

// Remove Buddy (Dissolve the relationship)
const removeBuddy = async (req, res) => {
  try {
    const { userId, buddyId } = req.body;

    // Remove the linkage
    await db.collection('users').doc(userId).update({ currentBuddyId: admin.firestore.FieldValue.delete() });
    await db.collection('users').doc(buddyId).update({ currentBuddyId: admin.firestore.FieldValue.delete() });

    return res.status(200).json({ status: 'success', message: 'Buddy relationship dissolved.' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get Buddy Status (Check if pending or buddies)
const checkBuddyStatus = async (req, res) => {
  try {
    const { currentUserId, targetUserId } = req.query;

    const userDoc = await db.collection('users').doc(currentUserId).get();
    
    // Check if they are already buddies
    if (userDoc.data().currentBuddyId === targetUserId) {
      return res.status(200).json({ status: 'success', data: { relation: 'buddies' } });
    }

    // Check if there's a pending request
    const sentQuery = await db.collection('buddyRequests')
      .where('senderId', '==', currentUserId)
      .where('receiverId', '==', targetUserId)
      .where('status', '==', 'pending').get();
      
    if (!sentQuery.empty) return res.status(200).json({ status: 'success', data: { relation: 'pending_sent' } });

    const receivedQuery = await db.collection('buddyRequests')
      .where('senderId', '==', targetUserId)
      .where('receiverId', '==', currentUserId)
      .where('status', '==', 'pending').get();
      
    if (!receivedQuery.empty) {
      const requestId = receivedQuery.docs[0].id;
      return res.status(200).json({ status: 'success', data: { relation: 'pending_received', requestId } });
    }

    return res.status(200).json({ status: 'success', data: { relation: 'none' } });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = { getRecommendations, sendBuddyRequest, acceptBuddyRequest, removeBuddy, checkBuddyStatus };