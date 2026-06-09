module.exports = function registerEventRoutes(app, { admin, db }) {
// Event Routes
/**
 * @route   POST /api/events
 * @desc    Create a new event/study group post
 * @access  Public (Will be protected later)
 */
app.post('/api/events', async (req, res) => {
  try {
    const { title, category, location, time, capacity, description, creatorId } = req.body;

    // Validate required fields
    if (!title || !category || !location || !time || !capacity || !creatorId) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required event fields.'
      });
    }

    // Prepare the event document blueprint
    const eventData = {
      title: title.trim(),
      category: category,
      location: location.trim(),
      time: time, // Expected to be an ISO string, e.g., "2026-05-22T14:00:00.000Z"
      capacity: Number(capacity),
      description: description ? description.trim() : '',
      creatorId: creatorId,
      attendees: [creatorId], // The creator automatically joins their own event
      status: 'open',         // 'open', 'full', or 'cancelled'
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Add the new event to the 'events' collection
    const eventRef = await db.collection('events').add(eventData);

    return res.status(201).json({
      status: 'success',
      message: 'Event created successfully!',
      data: {
        eventId: eventRef.id,
        ...eventData
      }
    });

  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

/**
 * @route   GET /api/events
 * @desc    Fetch all events (with optional category filter)
 * @access  Public
 */
app.get('/api/events', async (req, res) => {
  try {
    const { category } = req.query; 
    
    const snapshot = await db.collection('events').get();
    let events = [];

    snapshot.forEach(doc => {
      events.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Automatically hide events that have already passed
    const currentTimeMs = Date.now();
    events = events.filter(event => {
      if (!event.time) return false; // Hide invalid dates
      const eventTimeMs = new Date(event.time).getTime();
      return eventTimeMs > currentTimeMs; // Only keep future events
    });

    if (category && category !== 'All Events') {
      events = events.filter(event => event.category === category);
    }

    events.sort((a, b) => {
      const timeA = (a.createdAt && typeof a.createdAt.toMillis === 'function') ? a.createdAt.toMillis() : 0;
      const timeB = (b.createdAt && typeof b.createdAt.toMillis === 'function') ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

    const hydratedEvents = await Promise.all(events.map(async (event) => {
      try {
        const creatorDoc = await db.collection('users').doc(event.creatorId).get();
        const creatorData = creatorDoc.exists ? creatorDoc.data() : null;
        return { 
          ...event, 
          creatorName: creatorData?.name || 'NUS Student',
          creatorPicUrl: creatorData?.profilePicUrl || '' // Pull user customized avatar URL
        };
      } catch (err) {
        return { ...event, creatorName: 'NUS Student', creatorPicUrl: '' };
      }
    }));

    return res.status(200).json({
      status: 'success',
      data: hydratedEvents
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

/**
 * @route   GET /api/events/:eventId
 * @desc    Fetch details for a specific event by its ID
 * @access  Public
 */
app.get('/api/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const doc = await db.collection('events').doc(eventId).get();
    if (!doc.exists) {
      return res.status(404).json({ status: 'error', message: 'Event not found.' });
    }

    const eventData = doc.data();

    // Loop through attendee UIDs and fetch their actual profiles for frontend interaction
    const hydratedAttendees = await Promise.all((eventData.attendees || []).map(async (uid) => {
      try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          return {
            uid: uid,
            name: userData.name || 'NUS Student',
            faculty: userData.faculty || 'Unknown Faculty',
            year: userData.year || '',
            profilePicUrl: userData.profilePicUrl || '' // Inject customization image links
          };
        }
        return { uid, name: 'NUS Student', faculty: 'Unknown Faculty', year: '', profilePicUrl: '' };
      } catch (err) {
        return { uid, name: 'NUS Student', faculty: 'Unknown Faculty', year: '', profilePicUrl: '' };
      }
    }));

    return res.status(200).json({ 
      status: 'success', 
      data: { id: doc.id, ...eventData, attendees: hydratedAttendees }
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @route   PUT /api/events/:eventId/join
 * @desc    RSVP to an event
 * @access  Public
 */
app.put('/api/events/:eventId/join', async (req, res) => {
  const { eventId } = req.params;
  const { userId } = req.body;

  try {
    const eventRef = db.collection('events').doc(eventId);

    // Run a transaction to ensure thread-safe updates
    await db.runTransaction(async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists) throw new Error("Event does not exist.");

      const eventData = eventDoc.data();
      const attendees = eventData.attendees || [];

      // Check if user already joined
      if (attendees.includes(userId)) throw new Error("You have already joined this event.");
      
      // Check capacity
      if (attendees.length >= eventData.capacity) throw new Error("Event is full.");

      // Update the event
      transaction.update(eventRef, {
        attendees: admin.firestore.FieldValue.arrayUnion(userId),
        // If full, auto-update status (optional, for convenience)
        status: (attendees.length + 1 >= eventData.capacity) ? 'full' : 'open'
      });
    });

    return res.status(200).json({ status: 'success', message: 'Successfully joined!' });
  } catch (error) {
    return res.status(400).json({ status: 'error', message: error.message });
  }
});

/**
 * @route   PUT /api/events/:eventId/leave
 * @desc    Leave logic to safely exit an event roster
 * @access  Public
 */
app.put('/api/events/:eventId/leave', async (req, res) => {
  const { eventId } = req.params;
  const { userId } = req.body; // Passed from frontend storage state

  try {
    const eventRef = db.collection('events').doc(eventId);

    await db.runTransaction(async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists) throw new Error("Target campus event not found.");

      const eventData = eventDoc.data();
      const attendees = eventData.attendees || [];

      // Check if user is actually in the roster
      if (!attendees.includes(userId)) throw new Error("You are not part of this attendee roster.");
      
      // Host shouldn't break the room by leaving
      if (eventData.creatorId === userId) {
        throw new Error("Hosts cannot abandon their own event. Use cancellation instead.");
      }

      // Remove the user from array and force reopen status flag
      transaction.update(eventRef, {
        attendees: admin.firestore.FieldValue.arrayRemove(userId),
        status: 'open' // Freeing up a slot naturally marks the state back to open
      });
    });

    return res.status(200).json({ status: 'success', message: 'Successfully removed from gathering.' });
  } catch (error) {
    return res.status(400).json({ status: 'error', message: error.message });
  }
});

/**
 * @route   DELETE /api/events/:eventId
 * @desc    Permanently delete an event document
 * @access  Public
 */
app.delete('/api/events/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { userId } = req.body; // Pass current authenticated UID to verify ownership

  try {
    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({ status: 'error', message: 'Gathering records not found.' });
    }

    // Ensure the requesting user is the real creator
    if (eventDoc.data().creatorId !== userId) {
      return res.status(403).json({ status: 'error', message: 'Permission denied. Only hosts can dissolve gatherings.' });
    }

    // Execute absolute document wipeout
    await eventRef.delete();
    return res.status(200).json({ status: 'success', message: 'Event successfully dissolved.' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @route   PUT /api/events/:eventId
 * @desc    Update an existing campus event properties
 * @access  Public
 */
app.put('/api/events/:eventId', async (req, res) => {
  const { eventId } = req.params;
  // userId is passed to verify ownership, along with the updated form fields
  const { userId, title, category, location, time, capacity, description } = req.body;

  try {
    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({ status: 'error', message: 'Event record not found.' });
    }

    const eventData = eventDoc.data();

    // Ensure only the original creator can edit the details
    if (eventData.creatorId !== userId) {
      return res.status(403).json({ status: 'error', message: 'Permission denied. Only hosts can edit.' });
    }

    const currentAttendeesCount = eventData.attendees?.length || 0;
    const newCapacity = Number(capacity);

    // Prevent lowering capacity below the current room roster count
    if (newCapacity < currentAttendeesCount) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot lower max slots below the current number of checked-in attendees (${currentAttendeesCount} pax).`
      });
    }

    // Assemble the updated patch layout
    const updatedFields = {
      title: title ? title.trim() : eventData.title,
      category: category || eventData.category,
      location: location ? location.trim() : eventData.location,
      time: time || eventData.time,
      capacity: newCapacity,
      description: description !== undefined ? description.trim() : eventData.description,
      // Recalculate status dynamically based on the updated seating threshold
      status: (currentAttendeesCount >= newCapacity) ? 'full' : 'open',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Apply patch changes to Firestore document
    await eventRef.update(updatedFields);

    return res.status(200).json({
      status: 'success',
      message: 'Event parameters updated successfully!',
      data: updatedFields
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});
};
