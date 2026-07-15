const request = require('supertest');
const {
  SERVER_TIMESTAMP: mockServerTimestamp,
  arrayRemove: mockArrayRemove,
  arrayUnion: mockArrayUnion,
  createFirestoreMock
} = require('./helpers/firestoreMock');

let mockDb;
let app;

jest.mock('firebase-admin', () => ({
  credential: {
    cert: jest.fn(() => ({ credential: true }))
  },
  initializeApp: jest.fn(),
  firestore: Object.assign(jest.fn(() => mockDb), {
    FieldValue: {
      arrayRemove: mockArrayRemove,
      arrayUnion: mockArrayUnion,
      serverTimestamp: jest.fn(() => mockServerTimestamp)
    }
  })
}));

const loadAppWithSeed = (seed = {}) => {
  jest.resetModules();
  mockDb = createFirestoreMock(seed);
  app = require('../server');
  return app;
};

describe('Points awarding', () => {
  describe('Likes received', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
      loadAppWithSeed({
        // 48 points; a like is worth 2, so this crosses the Level 2 (50pt) threshold exactly.
        'users/author-1': { name: 'Author', points: 48 },
        'users/liker-1': { name: 'Liker' },
        'forums/post-1': { title: 'Test post', creatorId: 'author-1', likes: [] }
      });
    });

    test('liking a post awards points to the author and crosses a level threshold', async () => {
      const response = await request(app)
        .put('/api/forums/post-1/toggle-like')
        .send({ userId: 'liker-1' });

      expect(response.statusCode).toBe(200);

      const authorDoc = await mockDb.collection('users').doc('author-1').get();
      expect(authorDoc.data().points).toBe(50);

      const notifSnap = await mockDb.collection('notifications').get();
      expect(notifSnap.size).toBe(1);
      expect(notifSnap.docs[0].data()).toMatchObject({ userId: 'author-1', type: 'points' });
    });

    test('removing a like does not award points', async () => {
      await mockDb.collection('forums').doc('post-1').update({ likes: ['liker-1'] });

      const response = await request(app)
        .put('/api/forums/post-1/toggle-like')
        .send({ userId: 'liker-1' });

      expect(response.statusCode).toBe(200);

      const authorDoc = await mockDb.collection('users').doc('author-1').get();
      expect(authorDoc.data().points).toBe(48);
    });
  });

  describe('Forum post/comment creation', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
      loadAppWithSeed({
        'users/author-1': { name: 'Author', points: 0 },
        'forums/post-1': { title: 'Test post', creatorId: 'other-user', likes: [] }
      });
    });

    test('creating a post awards forumPostCreated points, without a notification (no level crossed)', async () => {
      const response = await request(app).post('/api/forums').send({
        title: 'New post', content: 'hello', category: 'Study', creatorId: 'author-1'
      });

      expect(response.statusCode).toBe(201);

      const authorDoc = await mockDb.collection('users').doc('author-1').get();
      expect(authorDoc.data().points).toBe(5);

      const notifSnap = await mockDb.collection('notifications').get();
      expect(notifSnap.size).toBe(0);
    });

    test('creating a comment awards forumCommentCreated points', async () => {
      const response = await request(app)
        .post('/api/forums/post-1/comments')
        .send({ userId: 'author-1', text: 'Nice!' });

      expect(response.statusCode).toBe(201);

      const authorDoc = await mockDb.collection('users').doc('author-1').get();
      expect(authorDoc.data().points).toBe(3);
    });
  });

  describe('Event attendance and hosting', () => {
    const futureIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    beforeEach(() => {
      global.fetch = jest.fn();
      loadAppWithSeed({
        'users/host-1': { name: 'Host', points: 0 },
        'users/guest-1': { name: 'Guest', points: 0 },
        'events/open-event': {
          title: 'Study Session', category: 'Study', location: 'COM1', time: futureIso,
          capacity: 5, creatorId: 'host-1', attendees: ['host-1'], status: 'open'
        }
      });
    });

    test('joining an event awards eventAttended points', async () => {
      const response = await request(app)
        .put('/api/events/open-event/join')
        .send({ userId: 'guest-1' });

      expect(response.statusCode).toBe(200);

      const guestDoc = await mockDb.collection('users').doc('guest-1').get();
      expect(guestDoc.data().points).toBe(10);
    });

    test('creating an event awards eventHosted points', async () => {
      const response = await request(app).post('/api/events').send({
        title: 'Makan Jio', category: 'Food', location: 'Utown', time: futureIso,
        capacity: '4', description: 'Dinner after class', creatorId: 'host-1'
      });

      expect(response.statusCode).toBe(201);

      const hostDoc = await mockDb.collection('users').doc('host-1').get();
      expect(hostDoc.data().points).toBe(15);
    });
  });

  describe('Buddy match (one-time per user)', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
      loadAppWithSeed({
        'users/a-1': { name: 'A', year: 'Year 2', points: 0 },
        'users/b-1': { name: 'B', year: 'Year 2', points: 0 },
        'buddyRequests/req-1': { senderId: 'a-1', receiverId: 'b-1', status: 'pending' }
      });
    });

    test('accepting a buddy request awards buddyMatched points to both parties, once', async () => {
      const response = await request(app)
        .put('/api/buddy/accept')
        .send({ requestId: 'req-1', senderId: 'a-1', receiverId: 'b-1' });

      expect(response.statusCode).toBe(200);

      const aDoc = await mockDb.collection('users').doc('a-1').get();
      const bDoc = await mockDb.collection('users').doc('b-1').get();
      expect(aDoc.data().points).toBe(25);
      expect(bDoc.data().points).toBe(25);
      expect(aDoc.data().pointsAwardedOnce).toEqual(['buddyMatched']);

      // Directly calling awardPointsOnce again with the same onceKey (simulating a second
      // match after a breakup) must not award points a second time.
      const pointsService = require('../utils/pointsService');
      const awardedAgain = await pointsService.awardPointsOnce('a-1', 'buddyMatched', 'buddyMatched');
      expect(awardedAgain).toBe(false);

      const aDocAfter = await mockDb.collection('users').doc('a-1').get();
      expect(aDocAfter.data().points).toBe(25);
    });
  });

  describe('Profile setup completion (one-time)', () => {
    const validPayload = {
      userId: 'user-1', name: 'Ava', faculty: 'Computing', year: 'Year 2',
      modules: ['CS2103T'], interests: ['AI']
    };

    test('completing profile setup for the first time awards profileSetupComplete points', async () => {
      global.fetch = jest.fn();
      loadAppWithSeed({
        'users/user-1': { email: 'user1@u.nus.edu', setupComplete: false, points: 0 }
      });

      const response = await request(app).put('/api/profile').send(validPayload);

      expect(response.statusCode).toBe(200);

      const userDoc = await mockDb.collection('users').doc('user-1').get();
      expect(userDoc.data().points).toBe(10);
      expect(userDoc.data().pointsAwardedOnce).toEqual(['profileSetupComplete']);
    });

    test('editing an already-complete profile does not re-award setup points', async () => {
      global.fetch = jest.fn();
      loadAppWithSeed({
        'users/user-1': { email: 'user1@u.nus.edu', setupComplete: true, points: 10, pointsAwardedOnce: ['profileSetupComplete'] }
      });

      const response = await request(app).put('/api/profile').send(validPayload);

      expect(response.statusCode).toBe(200);

      const userDoc = await mockDb.collection('users').doc('user-1').get();
      expect(userDoc.data().points).toBe(10);
    });
  });

  describe('First chat message per conversation (one-time)', () => {
    test('sending the first message in a conversation awards chatFirstMessage points once', async () => {
      global.fetch = jest.fn();
      loadAppWithSeed({
        'users/sender-1': { name: 'Sender', points: 0 },
        // Single participant on purpose: saveMessage's unread-count increment (FieldValue.increment)
        // isn't mocked in this test file, and only runs for OTHER participants besides the sender.
        'conversations/conv-1': { participants: ['sender-1'] }
      });
      const chatController = require('../controllers/chatController');

      await chatController.saveMessage('conv-1', 'sender-1', 'Hello!');

      const senderDoc = await mockDb.collection('users').doc('sender-1').get();
      expect(senderDoc.data().points).toBe(1);
      expect(senderDoc.data().pointsAwardedOnce).toEqual(['chatStarted_conv-1']);

      // A second message in the same conversation should not award points again.
      await chatController.saveMessage('conv-1', 'sender-1', 'Second message');

      const senderDocAfter = await mockDb.collection('users').doc('sender-1').get();
      expect(senderDocAfter.data().points).toBe(1);
    });
  });
});
