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
});
