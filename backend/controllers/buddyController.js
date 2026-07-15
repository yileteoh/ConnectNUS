const { admin, db } = require('../config/firebase');
const badgeService = require('../utils/badgeService');
const pointsService = require('../utils/pointsService');

// Get Personalized Recommendations
const getRecommendations = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Fetch current user to get their faculty
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    
    const myFaculty = userDoc.data().faculty || '';
    const myBuddy = userDoc.data().currentBuddyId || null;
    const myYear = userDoc.data().year || '';
    const myModules = userDoc.data().modules || [];
    const myInterests = userDoc.data().interests || [];

    // Fetch all students
    const snapshot = await db.collection('users').get();
    let recommendations = [];

    snapshot.forEach(doc => {
      const peerData = doc.data();
      // Exclude self, exclude people who already have a buddy, and exclude my current buddy
      if (doc.id !== userId && doc.id !== myBuddy && !peerData.currentBuddyId && peerData.buddyStatus !== false) {
        
        let score = 0;
        let commonTags = [];

        if (peerData.faculty === myFaculty) score += 3;
        
        if (peerData.year !== myYear) score += 3;

        const sharedModules = (peerData.modules || []).filter(m => myModules.includes(m));
        score += (sharedModules.length * 2);
        commonTags.push(...sharedModules);

        const sharedInterests = (peerData.interests || []).filter(i => myInterests.includes(i));
        score += (sharedInterests.length * 2);
        commonTags.push(...sharedInterests);

        recommendations.push({
          id: doc.id,
          ...peerData,
          matchScore: score,
          commonTags: commonTags
        });
      }
    });

    // Sort by match score descending
    recommendations = recommendations.sort((a, b) => b.matchScore - a.matchScore || Math.random() - 0.5).slice(0, 10); // Limit to top 10 recommendations

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

    if (receiverDoc.data().buddyStatus === false) {
      return res.status(403).json({ error: 'This user is currently not accepting buddy requests.' });
    }

    // Create pending request
    const newRequest = await db.collection('buddyRequests').add({
      senderId, receiverId, status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(201).json({ status: 'success', message: 'Request sent!', requestId: newRequest.id });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// Accept a Buddy Request (Enforce 1-on-1 rule securely)
const acceptBuddyRequest = async (req, res) => {
  try {
    const { requestId, senderId, receiverId } = req.body;
    let senderYear, receiverYear;

    await db.runTransaction(async (transaction) => {
      const senderRef = db.collection('users').doc(senderId);
      const receiverRef = db.collection('users').doc(receiverId);

      const senderDoc = await transaction.get(senderRef);
      const receiverDoc = await transaction.get(receiverRef);

      // Double check: if someone accepted another request a second ago, abort.
      if (senderDoc.data().currentBuddyId || receiverDoc.data().currentBuddyId) {
        throw new Error("One of the users already has a buddy.");
      }

      senderYear = senderDoc.data().year;
      receiverYear = receiverDoc.data().year;

      // Bind them together!
      transaction.update(senderRef, { currentBuddyId: receiverId, buddySince: admin.firestore.FieldValue.serverTimestamp() });
      transaction.update(receiverRef, { currentBuddyId: senderId, buddySince: admin.firestore.FieldValue.serverTimestamp() });

      // Mark request as accepted
      const requestRef = db.collection('buddyRequests').doc(requestId);
      transaction.update(requestRef, { status: 'accepted' });
    });

    // Award the one-time Buddy Bonder badge to the junior partner (or both, if same year)
    try {
      const seniorPartner = badgeService.getSeniorPartner(senderId, senderYear, receiverId, receiverYear);
      if (seniorPartner) {
        await badgeService.unlockOnce(seniorPartner.juniorId, 'buddyBonder');
      } else {
        await badgeService.unlockOnce(senderId, 'buddyBonder');
        await badgeService.unlockOnce(receiverId, 'buddyBonder');
      }
    } catch (e) { console.error('unlockOnce (buddy bonder) failed:', e); }

    // Award one-time buddyMatched points to both parties (per user, not per match, so
    // repeatedly breaking up and re-matching can't be used to farm points)
    try {
      await pointsService.awardPointsOnce(senderId, 'buddyMatched');
      await pointsService.awardPointsOnce(receiverId, 'buddyMatched');
    } catch (e) { console.error('awardPointsOnce (buddy matched) failed:', e); }

    const cleanupRequests = async (uid) => {
      const batch = db.batch();
      let count = 0;
      
      const sent = await db.collection('buddyRequests').where('senderId', '==', uid).where('status', '==', 'pending').get();
      sent.forEach(doc => { batch.delete(doc.ref); count++; });
      
      const received = await db.collection('buddyRequests').where('receiverId', '==', uid).where('status', '==', 'pending').get();
      received.forEach(doc => { batch.delete(doc.ref); count++; });
      
      if (count > 0) await batch.commit();
    };

    await Promise.all([cleanupRequests(senderId), cleanupRequests(receiverId)]);

    return res.status(200).json({ status: 'success', message: 'Buddy accepted! You are now locked 1-on-1.' });
  } catch (error) {
    return res.status(400).json({ status: 'error', message: error.message });
  }
};

// Remove Buddy (Dissolve the relationship)
const removeBuddy = async (req, res) => {
  try {
    const { userId, buddyId } = req.body;

    // Remove the linkage (also clears buddySince, which stops daily Buddy Mentor accrual for this pairing)
    await db.collection('users').doc(userId).update({
      currentBuddyId: admin.firestore.FieldValue.delete(),
      buddySince: admin.firestore.FieldValue.delete()
    });
    await db.collection('users').doc(buddyId).update({
      currentBuddyId: admin.firestore.FieldValue.delete(),
      buddySince: admin.firestore.FieldValue.delete()
    });

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
    const targetDoc = await db.collection('users').doc(targetUserId).get();

    if (targetDoc.exists && targetDoc.data().currentBuddyId && targetDoc.data().currentBuddyId !== currentUserId) {
      return res.status(200).json({ status: 'success', data: { relation: 'has_buddy' } });
    }
    
    // Check if they are already buddies
    if (userDoc.data().currentBuddyId === targetUserId) {
      return res.status(200).json({ status: 'success', data: { relation: 'buddies' } });
    }

    // Check if there's a pending request
    const sentQuery = await db.collection('buddyRequests')
      .where('senderId', '==', currentUserId)
      .where('receiverId', '==', targetUserId)
      .where('status', '==', 'pending').get();
      
    if (!sentQuery.empty) {
      const requestId = sentQuery.docs[0].id;
      return res.status(200).json({ status: 'success', data: { relation: 'pending_sent', requestId } });
    }

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

// Get all pending incoming buddy requests for a user
const getPendingRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    const snapshot = await db.collection('buddyRequests')
      .where('receiverId', '==', userId)
      .where('status', '==', 'pending')
      .get();

    let requests = [];
    for (let doc of snapshot.docs) {
      const reqData = doc.data();
      // Fetch sender's basic info to display in the inbox UI
      const senderDoc = await db.collection('users').doc(reqData.senderId).get();
      if (senderDoc.exists) {
        const senderData = senderDoc.data();
        if (senderData.currentBuddyId) {
          await db.collection('buddyRequests').doc(doc.id).delete();
          continue;
        }
        requests.push({
          id: doc.id,
          senderId: reqData.senderId,
          senderName: senderData.name || 'NUS Student',
          senderPicUrl: senderData.profilePicUrl || '',
          senderFaculty: senderData.faculty || '',
          createdAt: reqData.createdAt
        });
      }
    }
    
    // Sort so newest requests appear first
    requests.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

    return res.status(200).json({ status: 'success', data: requests });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get the profile of the current exclusive buddy
const getMyBuddyProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if the user has a buddy ID linked
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const buddyId = userDoc.data().currentBuddyId;
    if (!buddyId) return res.status(200).json({ status: 'success', data: null });

    // Fetch and return the buddy's full profile
    const buddyDoc = await db.collection('users').doc(buddyId).get();
    if (!buddyDoc.exists) return res.status(200).json({ status: 'success', data: null });

    return res.status(200).json({ 
      status: 'success', 
      data: { id: buddyDoc.id, ...buddyDoc.data() } 
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// Decline a buddy request (Delete the pending request)
const declineBuddyRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    await db.collection('buddyRequests').doc(requestId).delete();
    return res.status(200).json({ status: 'success', message: 'Request declined and removed.' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = { getRecommendations, sendBuddyRequest, acceptBuddyRequest, removeBuddy, checkBuddyStatus, getPendingRequests, getMyBuddyProfile, declineBuddyRequest };
