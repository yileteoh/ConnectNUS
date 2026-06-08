const request = require('supertest');
const {
  SERVER_TIMESTAMP: mockServerTimestamp,
  arrayRemove: mockArrayRemove,
  arrayUnion: mockArrayUnion,
  createFirestoreMock
} = require('./helpers/firestoreMock');

const futureIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const pastIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

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

describe('Milestone 1 API integration', () => {
  describe('user profile system', () => {
    beforeEach(() => {
      loadAppWithSeed({
        'users/existing-user': {
          email: 'student@u.nus.edu',
          createdAt: { seconds: 1 },
          setupComplete: false
        }
      });
    });

    test('POST /api/register syncs a new user shell into Firestore', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({ uid: 'new-user', email: 'new@u.nus.edu' });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      const userDoc = await mockDb.collection('users').doc('new-user').get();
      expect(userDoc.data()).toMatchObject({
        email: 'new@u.nus.edu',
        role: 'student',
        setupComplete: false
      });
    });

    test('PUT /api/profile validates required milestone profile fields', async () => {
      const response = await request(app)
        .put('/api/profile')
        .send({ userId: 'existing-user', name: 'Ava' });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('required fields');
    });

    test('PUT /api/profile updates modules, interests, optional profile fields, and preserves registration data', async () => {
      const payload = {
        userId: 'existing-user',
        name: 'Ava Tan',
        faculty: 'Computing',
        year: 'Year 2',
        modules: ['CS2103T', '', 'CS2106'],
        interests: ['Study groups', null, 'Hackathons'],
        bio: 'Looking for project mates.',
        profilePicUrl: 'https://example.com/avatar.png',
        socialLinks: ['https://linkedin.com/in/ava'],
        buddyStatus: true
      };

      const response = await request(app).put('/api/profile').send(payload);

      expect(response.statusCode).toBe(200);
      expect(response.body.data).toMatchObject({
        userId: 'existing-user',
        name: 'Ava Tan',
        faculty: 'Computing',
        year: 'Year 2',
        modules: ['CS2103T', 'CS2106'],
        interests: ['Study groups', 'Hackathons'],
        setupComplete: true,
        buddyStatus: true
      });

      const userDoc = await mockDb.collection('users').doc('existing-user').get();
      expect(userDoc.data()).toMatchObject({
        email: 'student@u.nus.edu',
        name: 'Ava Tan',
        setupComplete: true
      });
    });

    test('GET /api/profile/:userId returns saved profile details', async () => {
      await mockDb.collection('users').doc('existing-user').set({
        name: 'Ava Tan',
        faculty: 'Computing',
        year: 'Year 2',
        modules: ['CS2103T'],
        interests: ['Study groups']
      }, { merge: true });

      const response = await request(app).get('/api/profile/existing-user');

      expect(response.statusCode).toBe(200);
      expect(response.body.data).toMatchObject({
        name: 'Ava Tan',
        modules: ['CS2103T']
      });
    });
  });

  describe('event invitation posting system', () => {
    beforeEach(() => {
      loadAppWithSeed({
        'users/host-1': { name: 'Host Student', faculty: 'Computing', year: 'Year 3', profilePicUrl: 'https://example.com/host.png' },
        'users/guest-1': { name: 'Guest Student', faculty: 'Science', year: 'Year 1', profilePicUrl: '' },
        'events/open-event': {
          title: 'CS2103T Revision',
          category: 'Study',
          location: 'COM1',
          time: futureIso,
          capacity: 2,
          description: 'Bring notes.',
          creatorId: 'host-1',
          attendees: ['host-1'],
          status: 'open',
          createdAt: { seconds: 10, toMillis: () => 10000 }
        },
        'events/past-event': {
          title: 'Old Session',
          category: 'Study',
          location: 'Library',
          time: pastIso,
          capacity: 3,
          creatorId: 'host-1',
          attendees: ['host-1'],
          status: 'open',
          createdAt: { seconds: 1, toMillis: () => 1000 }
        }
      });
    });

    test('POST /api/events creates an invitation with required milestone fields and auto-attends the host', async () => {
      const response = await request(app).post('/api/events').send({
        title: 'Makan Jio',
        category: 'Food',
        location: 'Utown',
        time: futureIso,
        capacity: '4',
        description: 'Dinner after class',
        creatorId: 'host-1'
      });

      expect(response.statusCode).toBe(201);
      expect(response.body.data).toMatchObject({
        title: 'Makan Jio',
        category: 'Food',
        location: 'Utown',
        capacity: 4,
        attendees: ['host-1'],
        status: 'open'
      });
    });

    test('GET /api/events lists only future invitations and hydrates creator profile data', async () => {
      const response = await request(app).get('/api/events?category=Study');

      expect(response.statusCode).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        id: 'open-event',
        title: 'CS2103T Revision',
        creatorName: 'Host Student',
        creatorPicUrl: 'https://example.com/host.png'
      });
    });

    test('PUT /api/events/:eventId/join adds an attendee and marks the event full when capacity is reached', async () => {
      const response = await request(app)
        .put('/api/events/open-event/join')
        .send({ userId: 'guest-1' });

      expect(response.statusCode).toBe(200);

      const eventDoc = await mockDb.collection('events').doc('open-event').get();
      expect(eventDoc.data()).toMatchObject({
        attendees: ['host-1', 'guest-1'],
        status: 'full'
      });
    });

    test('GET /api/events/:eventId returns hydrated attendee details', async () => {
      await mockDb.collection('events').doc('open-event').set({
        attendees: ['host-1', 'guest-1'],
        status: 'full'
      }, { merge: true });

      const response = await request(app).get('/api/events/open-event');

      expect(response.statusCode).toBe(200);
      expect(response.body.data.attendees).toEqual([
        expect.objectContaining({ uid: 'host-1', name: 'Host Student', faculty: 'Computing' }),
        expect.objectContaining({ uid: 'guest-1', name: 'Guest Student', faculty: 'Science' })
      ]);
    });

    test('PUT /api/events/:eventId prevents non-host edits and invalid capacity reductions', async () => {
      const unauthorized = await request(app)
        .put('/api/events/open-event')
        .send({ userId: 'guest-1', title: 'Hijack', capacity: 2 });

      expect(unauthorized.statusCode).toBe(403);

      await mockDb.collection('events').doc('open-event').set({ attendees: ['host-1', 'guest-1'] }, { merge: true });
      const invalidCapacity = await request(app)
        .put('/api/events/open-event')
        .send({ userId: 'host-1', capacity: 1 });

      expect(invalidCapacity.statusCode).toBe(400);
    });

    test('DELETE /api/events/:eventId allows only the host to delete their invitation', async () => {
      const unauthorized = await request(app)
        .delete('/api/events/open-event')
        .send({ userId: 'guest-1' });

      expect(unauthorized.statusCode).toBe(403);

      const deleted = await request(app)
        .delete('/api/events/open-event')
        .send({ userId: 'host-1' });

      expect(deleted.statusCode).toBe(200);
      expect((await mockDb.collection('events').doc('open-event').get()).exists).toBe(false);
    });
  });

  describe('forum system', () => {
    beforeEach(() => {
      loadAppWithSeed({
        'users/author-1': { name: 'Forum Author', profilePicUrl: 'https://example.com/author.png' },
        'users/commenter-1': { name: 'Helpful Peer', profilePicUrl: '' },
        'forums/post-1': {
          title: 'Need CS1231 help',
          content: 'How should I approach induction?',
          category: 'Study',
          creatorId: 'author-1',
          likes: [],
          bookmarks: [],
          createdAt: { seconds: 10, toMillis: () => 10000 }
        },
        'forums/post-1/comments/comment-1': {
          userId: 'commenter-1',
          text: 'Start with the base case.',
          likes: [],
          createdAt: { seconds: 11, toMillis: () => 11000 }
        }
      });
    });

    test('POST /api/forums creates an academic discussion post', async () => {
      const response = await request(app).post('/api/forums').send({
        title: 'MA1521 tutorial group',
        content: 'Anyone wants to solve tutorial 4 together?',
        category: 'Study',
        creatorId: 'author-1'
      });

      expect(response.statusCode).toBe(201);
      expect(response.body.data).toMatchObject({
        title: 'MA1521 tutorial group',
        likes: [],
        bookmarks: []
      });
    });

    test('GET /api/forums hydrates author data and comment counts', async () => {
      const response = await request(app).get('/api/forums?category=Study');

      expect(response.statusCode).toBe(200);
      expect(response.body.data[0]).toMatchObject({
        id: 'post-1',
        creatorName: 'Forum Author',
        creatorPicUrl: 'https://example.com/author.png',
        commentCount: 1
      });
    });

    test('PUT forum like and bookmark routes toggle the current user', async () => {
      await request(app).put('/api/forums/post-1/toggle-like').send({ userId: 'commenter-1' }).expect(200);
      await request(app).put('/api/forums/post-1/toggle-bookmark').send({ userId: 'commenter-1' }).expect(200);

      let postDoc = await mockDb.collection('forums').doc('post-1').get();
      expect(postDoc.data()).toMatchObject({
        likes: ['commenter-1'],
        bookmarks: ['commenter-1']
      });

      await request(app).put('/api/forums/post-1/toggle-like').send({ userId: 'commenter-1' }).expect(200);
      postDoc = await mockDb.collection('forums').doc('post-1').get();
      expect(postDoc.data().likes).toEqual([]);
    });

    test('POST and GET comments support discussion replies with hydrated commenter data', async () => {
      const created = await request(app)
        .post('/api/forums/post-1/comments')
        .send({ userId: 'author-1', text: 'Thanks, that helps.' });

      expect(created.statusCode).toBe(201);

      const response = await request(app).get('/api/forums/post-1/comments');
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'comment-1',
          text: 'Start with the base case.',
          userName: 'Helpful Peer'
        }),
        expect.objectContaining({
          text: 'Thanks, that helps.',
          userName: 'Forum Author'
        })
      ]));
    });

    test('PUT and DELETE forum post routes enforce author ownership', async () => {
      await request(app)
        .put('/api/forums/post-1')
        .send({ userId: 'commenter-1', title: 'Nope', category: 'Study', content: 'Nope' })
        .expect(403);

      await request(app)
        .put('/api/forums/post-1')
        .send({ userId: 'author-1', title: 'Updated help request', category: 'Study', content: 'Updated content' })
        .expect(200);

      await request(app)
        .delete('/api/forums/post-1')
        .send({ userId: 'commenter-1' })
        .expect(403);

      await request(app)
        .delete('/api/forums/post-1')
        .send({ userId: 'author-1' })
        .expect(200);
    });
  });
});
