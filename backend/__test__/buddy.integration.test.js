const request = require('supertest');
const {
  SERVER_TIMESTAMP: mockServerTimestamp,
  arrayRemove: mockArrayRemove,
  arrayUnion: mockArrayUnion,
  deleteField: mockDeleteField,
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
      delete: mockDeleteField,
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

describe('Buddy system API integration', () => {
  describe('GET /api/buddy/recommendations/:userId', () => {
    beforeEach(() => {
      loadAppWithSeed({
        'users/me': {
          faculty: 'Computing', year: 'Year 2',
          modules: ['CS2103T', 'CS2106'], interests: ['Hackathons']
        },
        'users/same-faculty-diff-year': {
          faculty: 'Computing', year: 'Year 3',
          modules: ['CS2103T'], interests: []
        },
        'users/has-buddy-already': {
          faculty: 'Computing', year: 'Year 2', currentBuddyId: 'someone-else'
        },
        'users/opted-out': {
          faculty: 'Computing', year: 'Year 2', buddyStatus: false
        },
        'users/my-current-buddy': {
          faculty: 'Science', year: 'Year 1'
        }
      });
    });

    test('excludes self, users with a buddy, the caller\'s own buddy, and opted-out users', async () => {
      await mockDb.collection('users').doc('me').set({ currentBuddyId: 'my-current-buddy' }, { merge: true });

      const response = await request(app).get('/api/buddy/recommendations/me');

      expect(response.statusCode).toBe(200);
      const ids = response.body.data.map((r) => r.id);
      expect(ids).not.toContain('me');
      expect(ids).not.toContain('has-buddy-already');
      expect(ids).not.toContain('opted-out');
      expect(ids).not.toContain('my-current-buddy');
      expect(ids).toContain('same-faculty-diff-year');
    });

    test('scores same faculty + different year + shared modules higher, sorted descending', async () => {
      const response = await request(app).get('/api/buddy/recommendations/me');

      expect(response.statusCode).toBe(200);
      const top = response.body.data[0];
      expect(top.id).toBe('same-faculty-diff-year');
      // same faculty (+3) + different year (+3) + 1 shared module (+2) = 8
      expect(top.matchScore).toBe(8);
      expect(top.commonTags).toContain('CS2103T');

      const scores = response.body.data.map((r) => r.matchScore);
      expect(scores).toEqual([...scores].sort((a, b) => b - a));
    });
  });

  describe('GET /api/buddy/status', () => {
    beforeEach(() => {
      loadAppWithSeed({
        'users/alice': {},
        'users/bob': {},
        'users/carol': { currentBuddyId: 'dave' },
        'users/dave': { currentBuddyId: 'carol' },
        'users/erin': {},
        'buddyRequests/req-sent': { senderId: 'alice', receiverId: 'bob', status: 'pending' }
      });
    });

    test('returns has_buddy when the target already has a different buddy', async () => {
      const res = await request(app).get('/api/buddy/status?currentUserId=alice&targetUserId=carol');
      expect(res.body.data).toEqual({ relation: 'has_buddy' });
    });

    test('returns buddies when the caller and target are already linked', async () => {
      const res = await request(app).get('/api/buddy/status?currentUserId=carol&targetUserId=dave');
      expect(res.body.data).toEqual({ relation: 'buddies' });
    });

    test('returns pending_sent with the requestId when the caller already sent a request', async () => {
      const res = await request(app).get('/api/buddy/status?currentUserId=alice&targetUserId=bob');
      expect(res.body.data).toMatchObject({ relation: 'pending_sent', requestId: 'req-sent' });
    });

    test('returns pending_received with the requestId for the recipient', async () => {
      const res = await request(app).get('/api/buddy/status?currentUserId=bob&targetUserId=alice');
      expect(res.body.data).toMatchObject({ relation: 'pending_received', requestId: 'req-sent' });
    });

    test('returns none when there is no relationship', async () => {
      const res = await request(app).get('/api/buddy/status?currentUserId=bob&targetUserId=erin');
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual({ relation: 'none' });
    });
  });

  describe('POST /api/buddy/request', () => {
    beforeEach(() => {
      loadAppWithSeed({
        'users/free-sender': {},
        'users/free-receiver': {},
        'users/taken-sender': { currentBuddyId: 'x' },
        'users/taken-receiver': { currentBuddyId: 'y' },
        'users/opted-out-receiver': { buddyStatus: false }
      });
    });

    test('creates a pending request between two free users', async () => {
      const res = await request(app)
        .post('/api/buddy/request')
        .send({ senderId: 'free-sender', receiverId: 'free-receiver' });

      expect(res.statusCode).toBe(201);
      expect(res.body.requestId).toBeTruthy();

      const created = await mockDb.collection('buddyRequests').doc(res.body.requestId).get();
      expect(created.data()).toMatchObject({
        senderId: 'free-sender', receiverId: 'free-receiver', status: 'pending'
      });
    });

    test('rejects when the sender already has a buddy', async () => {
      const res = await request(app)
        .post('/api/buddy/request')
        .send({ senderId: 'taken-sender', receiverId: 'free-receiver' });

      expect(res.statusCode).toBe(400);
    });

    test('rejects when the receiver already has a buddy', async () => {
      const res = await request(app)
        .post('/api/buddy/request')
        .send({ senderId: 'free-sender', receiverId: 'taken-receiver' });

      expect(res.statusCode).toBe(400);
    });

    test('rejects with 403 when the receiver is not accepting buddy requests', async () => {
      const res = await request(app)
        .post('/api/buddy/request')
        .send({ senderId: 'free-sender', receiverId: 'opted-out-receiver' });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('PUT /api/buddy/accept', () => {
    beforeEach(() => {
      loadAppWithSeed({
        'users/alice': {},
        'users/bob': {},
        'users/carol': {},
        'buddyRequests/req-main': { senderId: 'alice', receiverId: 'bob', status: 'pending' },
        // Stale requests that should be cleaned up once alice/bob are bound
        'buddyRequests/req-alice-other': { senderId: 'alice', receiverId: 'carol', status: 'pending' },
        'buddyRequests/req-other-bob': { senderId: 'carol', receiverId: 'bob', status: 'pending' }
      });
    });

    test('links both users, marks the request accepted, and cleans up other pending requests', async () => {
      const res = await request(app)
        .put('/api/buddy/accept')
        .send({ requestId: 'req-main', senderId: 'alice', receiverId: 'bob' });

      expect(res.statusCode).toBe(200);

      const alice = await mockDb.collection('users').doc('alice').get();
      const bob = await mockDb.collection('users').doc('bob').get();
      expect(alice.data().currentBuddyId).toBe('bob');
      expect(bob.data().currentBuddyId).toBe('alice');

      const mainReq = await mockDb.collection('buddyRequests').doc('req-main').get();
      expect(mainReq.data().status).toBe('accepted');

      const staleAlice = await mockDb.collection('buddyRequests').doc('req-alice-other').get();
      const staleBob = await mockDb.collection('buddyRequests').doc('req-other-bob').get();
      expect(staleAlice.exists).toBe(false);
      expect(staleBob.exists).toBe(false);
    });

    test('fails when one of the users already has a buddy at accept-time', async () => {
      await mockDb.collection('users').doc('bob').set({ currentBuddyId: 'carol' }, { merge: true });

      const res = await request(app)
        .put('/api/buddy/accept')
        .send({ requestId: 'req-main', senderId: 'alice', receiverId: 'bob' });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/buddy/remove', () => {
    beforeEach(() => {
      loadAppWithSeed({
        'users/alice': { currentBuddyId: 'bob' },
        'users/bob': { currentBuddyId: 'alice' }
      });
    });

    test('dissolves the relationship on both sides', async () => {
      const res = await request(app)
        .post('/api/buddy/remove')
        .send({ userId: 'alice', buddyId: 'bob' });

      expect(res.statusCode).toBe(200);

      const alice = await mockDb.collection('users').doc('alice').get();
      const bob = await mockDb.collection('users').doc('bob').get();
      expect(alice.data().currentBuddyId).toBeUndefined();
      expect(bob.data().currentBuddyId).toBeUndefined();
    });
  });

  describe('GET /api/buddy/requests/:userId', () => {
    beforeEach(() => {
      loadAppWithSeed({
        'users/receiver': {},
        'users/sender-fresh': { name: 'Fresh Sender', faculty: 'Computing', profilePicUrl: 'pic.png' },
        'users/sender-stale': { name: 'Stale Sender', currentBuddyId: 'someone' },
        'buddyRequests/req-fresh': {
          senderId: 'sender-fresh', receiverId: 'receiver', status: 'pending',
          createdAt: { seconds: 20, toMillis: () => 20000 }
        },
        'buddyRequests/req-stale': {
          senderId: 'sender-stale', receiverId: 'receiver', status: 'pending',
          createdAt: { seconds: 10, toMillis: () => 10000 }
        }
      });
    });

    test('returns the pending inbox and self-heals requests whose sender already has a buddy', async () => {
      const res = await request(app).get('/api/buddy/requests/receiver');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        id: 'req-fresh', senderId: 'sender-fresh', senderName: 'Fresh Sender'
      });

      const staleReq = await mockDb.collection('buddyRequests').doc('req-stale').get();
      expect(staleReq.exists).toBe(false);
    });
  });

  describe('GET /api/buddy/mybuddy/:userId', () => {
    beforeEach(() => {
      loadAppWithSeed({
        'users/has-buddy': { currentBuddyId: 'the-buddy' },
        'users/the-buddy': { name: 'The Buddy', faculty: 'Computing' },
        'users/no-buddy': {}
      });
    });

    test('returns the buddy\'s full profile when linked', async () => {
      const res = await request(app).get('/api/buddy/mybuddy/has-buddy');
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({ id: 'the-buddy', name: 'The Buddy' });
    });

    test('returns null when the user has no buddy', async () => {
      const res = await request(app).get('/api/buddy/mybuddy/no-buddy');
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeNull();
    });
  });

  describe('DELETE /api/buddy/request/:requestId', () => {
    beforeEach(() => {
      loadAppWithSeed({
        'buddyRequests/req-to-decline': { senderId: 'a', receiverId: 'b', status: 'pending' }
      });
    });

    test('deletes the pending request', async () => {
      const res = await request(app).delete('/api/buddy/request/req-to-decline');
      expect(res.statusCode).toBe(200);

      const deleted = await mockDb.collection('buddyRequests').doc('req-to-decline').get();
      expect(deleted.exists).toBe(false);
    });
  });
});
