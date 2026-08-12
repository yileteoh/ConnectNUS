const request = require('supertest');
const {
  SERVER_TIMESTAMP: mockServerTimestamp,
  arrayRemove: mockArrayRemove,
  arrayUnion: mockArrayUnion,
  createFirestoreMock
} = require('./helpers/firestoreMock');

let mockDb;
let app;

// Mock firebase-admin to use the Firestore mock instead of the real Firestore
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

// Mock fetch to prevent actual network requests during tests
const loadAppWithSeed = (seed = {}) => {
  jest.resetModules();
  mockDb = createFirestoreMock(seed);
  app = require('../server');
  return app;
};

// Reset the mock database and reload the app before each test
describe('Badge awarding', () => {
  describe('Popular Poster (likes received)', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
      loadAppWithSeed({
        // No pushToken seeded, so notificationHelper never hits the fetch branch.
        'users/author-1': { name: 'Author', badgeCounts: { likesReceived: 9 }, badges: [] },
        'users/liker-1': { name: 'Liker' },
        'forums/post-1': { title: 'Test post', creatorId: 'author-1', likes: [] }
      });
    });

    test('crossing the bronze threshold (10 likes) awards the badge and writes a notification', async () => {
      const response = await request(app)
        .put('/api/forums/post-1/toggle-like')
        .send({ userId: 'liker-1' });

      expect(response.statusCode).toBe(200);

      const authorDoc = await mockDb.collection('users').doc('author-1').get();
      expect(authorDoc.data().badgeCounts.likesReceived).toBe(10);
      expect(authorDoc.data().badges).toEqual([
        expect.objectContaining({ category: 'likesReceived', tier: 'bronze', name: 'Popular Poster' })
      ]);

      const notifSnap = await mockDb.collection('notifications').get();
      expect(notifSnap.size).toBe(1);
      expect(notifSnap.docs[0].data()).toMatchObject({ userId: 'author-1', type: 'badge' });
    });

    test('removing a like does not award or double-count', async () => {
      await mockDb.collection('forums').doc('post-1').update({ likes: ['liker-1'] });

      const response = await request(app)
        .put('/api/forums/post-1/toggle-like')
        .send({ userId: 'liker-1' });

      expect(response.statusCode).toBe(200);

      const authorDoc = await mockDb.collection('users').doc('author-1').get();
      expect(authorDoc.data().badgeCounts.likesReceived).toBe(9);
      expect(authorDoc.data().badges).toEqual([]);
    });

    test('does not re-award an already-unlocked tier', async () => {
      await mockDb.collection('users').doc('author-1').set({
        badgeCounts: { likesReceived: 10 },
        badges: [{ id: 'likesReceived_bronze', category: 'likesReceived', tier: 'bronze', name: 'Popular Poster', unlockedAt: 'x' }]
      }, { merge: true });

      // A second, different liker pushes the count to 11 - still bronze tier, shouldn't duplicate.
      await mockDb.collection('users').doc('liker-2').set({ name: 'Liker 2' });
      const response = await request(app)
        .put('/api/forums/post-1/toggle-like')
        .send({ userId: 'liker-2' });

      expect(response.statusCode).toBe(200);

      const authorDoc = await mockDb.collection('users').doc('author-1').get();
      expect(authorDoc.data().badgeCounts.likesReceived).toBe(11);
      expect(authorDoc.data().badges).toHaveLength(1);

      const notifSnap = await mockDb.collection('notifications').get();
      expect(notifSnap.size).toBe(0);
    });
  });

  describe('Popular Poster (comment likes)', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
      loadAppWithSeed({
        'users/commenter-1': { name: 'Commenter', badgeCounts: { likesReceived: 9 }, badges: [] },
        'users/liker-1': { name: 'Liker' },
        'forums/post-1': { title: 'Test post', creatorId: 'someone-else', likes: [] },
        'forums/post-1/comments/comment-1': { userId: 'commenter-1', text: 'Nice!', likes: [] }
      });
    });

    test('liking a comment awards progress to the comment author, not the post creator', async () => {
      const response = await request(app)
        .put('/api/forums/post-1/comments/comment-1/toggle-like')
        .send({ userId: 'liker-1' });

      expect(response.statusCode).toBe(200);

      const commenterDoc = await mockDb.collection('users').doc('commenter-1').get();
      expect(commenterDoc.data().badgeCounts.likesReceived).toBe(10);

      const creatorDoc = await mockDb.collection('users').doc('someone-else').get();
      expect(creatorDoc.exists).toBe(false);
    });
  });

  describe('Event Explorer (attendance)', () => {
    const futureIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    beforeEach(() => {
      global.fetch = jest.fn();
      loadAppWithSeed({
        'users/host-1': { name: 'Host' },
        'users/guest-1': { name: 'Guest', badgeCounts: { eventsAttended: 2 }, badges: [] },
        'events/open-event': {
          title: 'Study Session', category: 'Study', location: 'COM1', time: futureIso,
          capacity: 5, creatorId: 'host-1', attendees: ['host-1'], status: 'open'
        }
      });
    });

    test('joining an event crosses the bronze threshold (3 events) and awards the badge', async () => {
      const response = await request(app)
        .put('/api/events/open-event/join')
        .send({ userId: 'guest-1' });

      expect(response.statusCode).toBe(200);

      const guestDoc = await mockDb.collection('users').doc('guest-1').get();
      expect(guestDoc.data().badgeCounts.eventsAttended).toBe(3);
      expect(guestDoc.data().badges).toEqual([
        expect.objectContaining({ category: 'eventsAttended', tier: 'bronze', name: 'Event Explorer' })
      ]);
    });
  });

  describe('Event Host (hosting)', () => {
    const futureIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    beforeEach(() => {
      global.fetch = jest.fn();
      loadAppWithSeed({
        'users/host-1': { name: 'Host', badgeCounts: { eventsHosted: 0 }, badges: [] }
      });
    });

    test('creating an event crosses the bronze threshold (1 event) and awards the badge', async () => {
      const response = await request(app).post('/api/events').send({
        title: 'Makan Jio', category: 'Food', location: 'Utown', time: futureIso,
        capacity: '4', description: 'Dinner after class', creatorId: 'host-1'
      });

      expect(response.statusCode).toBe(201);

      const hostDoc = await mockDb.collection('users').doc('host-1').get();
      expect(hostDoc.data().badgeCounts.eventsHosted).toBe(1);
      expect(hostDoc.data().badges).toEqual([
        expect.objectContaining({ category: 'eventsHosted', tier: 'bronze', name: 'Event Host' })
      ]);
    });
  });

  describe('Buddy Bonder (one-time, junior/mentee side)', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    test('junior partner gets Buddy Bonder (and buddySince is set) when years differ', async () => {
      loadAppWithSeed({
        'users/senior-1': { name: 'Senior', year: 'Year 3', badges: [] },
        'users/junior-1': { name: 'Junior', year: 'Year 1', badges: [] },
        'buddyRequests/req-1': { senderId: 'senior-1', receiverId: 'junior-1', status: 'pending' }
      });

      const response = await request(app)
        .put('/api/buddy/accept')
        .send({ requestId: 'req-1', senderId: 'senior-1', receiverId: 'junior-1' });

      expect(response.statusCode).toBe(200);

      const juniorDoc = await mockDb.collection('users').doc('junior-1').get();
      expect(juniorDoc.data().badges).toEqual([
        expect.objectContaining({ category: 'buddyBonder', tier: null, name: 'Buddy Bonder' })
      ]);
      expect(juniorDoc.data().buddySince).toBeDefined();

      const seniorDoc = await mockDb.collection('users').doc('senior-1').get();
      expect(seniorDoc.data().badges).toEqual([]);
      expect(seniorDoc.data().buddySince).toBeDefined();
    });

    test('both partners get Buddy Bonder when years are equal (no senior/junior split)', async () => {
      loadAppWithSeed({
        'users/a-1': { name: 'A', year: 'Year 2', badges: [] },
        'users/b-1': { name: 'B', year: 'Year 2', badges: [] },
        'buddyRequests/req-2': { senderId: 'a-1', receiverId: 'b-1', status: 'pending' }
      });

      const response = await request(app)
        .put('/api/buddy/accept')
        .send({ requestId: 'req-2', senderId: 'a-1', receiverId: 'b-1' });

      expect(response.statusCode).toBe(200);

      const aDoc = await mockDb.collection('users').doc('a-1').get();
      const bDoc = await mockDb.collection('users').doc('b-1').get();
      expect(aDoc.data().badges).toEqual([expect.objectContaining({ category: 'buddyBonder' })]);
      expect(bDoc.data().badges).toEqual([expect.objectContaining({ category: 'buddyBonder' })]);
    });
  });

  describe('Buddy Mentor (duration) - core mechanism', () => {
    test('getSeniorPartner ranks by YEAR_OPTIONS seniority and returns null on a tie', () => {
      loadAppWithSeed({});
      const badgeService = require('../utils/badgeService');

      expect(badgeService.getSeniorPartner('a', 'Year 1', 'b', 'Year 3')).toEqual({ seniorId: 'b', juniorId: 'a' });
      expect(badgeService.getSeniorPartner('a', 'Graduate', 'b', 'Year 5+')).toEqual({ seniorId: 'a', juniorId: 'b' });
      expect(badgeService.getSeniorPartner('a', 'Year 2', 'b', 'Year 2')).toBeNull();
    });

    test('awardProgress accumulates buddyMentorDays and crosses the bronze tier at 7 days (the mechanism the daily cron job drives)', async () => {
      global.fetch = jest.fn();
      loadAppWithSeed({
        'users/senior-1': { badgeCounts: { buddyMentorDays: 6 }, badges: [] }
      });
      const badgeService = require('../utils/badgeService');

      const unlocked = await badgeService.awardProgress('senior-1', 'buddyMentorDays', 1);

      expect(unlocked).toEqual([
        expect.objectContaining({ category: 'buddyMentorDays', tier: 'bronze', name: 'Buddy Mentor' })
      ]);

      const doc = await mockDb.collection('users').doc('senior-1').get();
      expect(doc.data().badgeCounts.buddyMentorDays).toBe(7);
    });
  });
});
