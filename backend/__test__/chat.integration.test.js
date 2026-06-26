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

describe('Chat system API integration', () => {
  describe('POST /api/chat/conversations', () => {
    beforeEach(() => {
      loadAppWithSeed({
        'users/alice': { name: 'Alice', profilePicUrl: 'alice.png' },
        'users/bob': { name: 'Bob', profilePicUrl: '' },
        'conversations/alice_bob': {
          participants: ['alice', 'bob'],
          lastMessage: { text: 'hey', senderId: 'alice' }
        }
      });
    });

    test('creates a new conversation with hydrated participant info when none exists', async () => {
      const res = await request(app)
        .post('/api/chat/conversations')
        .send({ userId1: 'bob', userId2: 'carol' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toMatchObject({
        conversationId: 'bob_carol',
        participants: ['bob', 'carol'],
        participantInfo: {
          bob: { name: 'Bob', profilePicUrl: '' },
          carol: { name: 'User', profilePicUrl: '' }
        }
      });
    });

    test('returns the existing conversation unchanged when one already exists', async () => {
      const res = await request(app)
        .post('/api/chat/conversations')
        .send({ userId1: 'alice', userId2: 'bob' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        conversationId: 'alice_bob',
        lastMessage: { text: 'hey', senderId: 'alice' }
      });
    });

    test('produces the same conversationId regardless of argument order', async () => {
      const res = await request(app)
        .post('/api/chat/conversations')
        .send({ userId1: 'bob', userId2: 'alice' });

      expect(res.body.data.conversationId).toBe('alice_bob');
    });
  });

  describe('GET /api/chat/conversations/:userId', () => {
    beforeEach(() => {
      loadAppWithSeed({
        'conversations/conv-newest': {
          participants: ['me', 'alice'],
          lastMessageTime: { _seconds: 300 }
        },
        'conversations/conv-oldest': {
          participants: ['me', 'bob'],
          lastMessageTime: { _seconds: 100 }
        },
        'conversations/conv-no-messages-yet': {
          participants: ['me', 'carol'],
          lastMessageTime: null
        },
        'conversations/conv-not-mine': {
          participants: ['alice', 'bob'],
          lastMessageTime: { _seconds: 200 }
        }
      });
    });

    test('only returns conversations the user participates in, sorted newest-first', async () => {
      const res = await request(app).get('/api/chat/conversations/me');

      expect(res.statusCode).toBe(200);
      const ids = res.body.data.map((c) => c.conversationId);
      expect(ids).not.toContain('conv-not-mine');
      expect(ids).toEqual(['conv-newest', 'conv-oldest', 'conv-no-messages-yet']);
    });
  });

  describe('GET /api/chat/messages/:conversationId', () => {
    beforeEach(() => {
      loadAppWithSeed({
        'conversations/conv-1': { participants: ['me', 'alice'] },
        'conversations/conv-1/messages/msg-1': {
          senderId: 'me', text: 'hello', type: 'text',
          timestamp: { seconds: 1, toMillis: () => 1000 }
        },
        'conversations/conv-1/messages/msg-2': {
          senderId: 'alice', text: 'hi back', type: 'text',
          timestamp: { seconds: 2, toMillis: () => 2000 }
        }
      });
    });

    test('returns message history with Firestore timestamps converted to millis', async () => {
      const res = await request(app).get('/api/chat/messages/conv-1');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual([
        expect.objectContaining({ messageId: 'msg-1', text: 'hello', timestamp: 1000 }),
        expect.objectContaining({ messageId: 'msg-2', text: 'hi back', timestamp: 2000 })
      ]);
    });
  });

  describe('PUT /api/chat/read/:conversationId/:userId', () => {
    beforeEach(() => {
      loadAppWithSeed({
        'conversations/conv-1': {
          participants: ['me', 'alice'],
          unreadCounts: { 'me': 3 }
        }
      });
    });

    test('resets the unread count for that user', async () => {
      const res = await request(app).put('/api/chat/read/conv-1/me');
      expect(res.statusCode).toBe(200);

      const conv = await mockDb.collection('conversations').doc('conv-1').get();
      expect(conv.data()['unreadCounts.me']).toBe(0);
    });
  });

  describe('POST /api/chat/group/:eventId', () => {
    beforeEach(() => {
      loadAppWithSeed({
        'conversations/event_existing-event': {
          type: 'group',
          eventId: 'existing-event',
          participants: ['host-1'],
          participantInfo: { 'host-1': { name: 'Host', profilePicUrl: '' } }
        }
      });
    });

    test('creates the group conversation when it does not exist yet', async () => {
      const res = await request(app)
        .post('/api/chat/group/new-event')
        .send({ eventTitle: 'Study Jam', userId: 'host-1', userName: 'Host', userProfilePic: '' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual({ conversationId: 'event_new-event' });

      const conv = await mockDb.collection('conversations').doc('event_new-event').get();
      expect(conv.data()).toMatchObject({
        type: 'group', eventId: 'new-event', participants: ['host-1']
      });
    });

    test('adds the caller to an existing group when not already a participant', async () => {
      const res = await request(app)
        .post('/api/chat/group/existing-event')
        .send({ userId: 'guest-1', userName: 'Guest', userProfilePic: '' });

      expect(res.statusCode).toBe(200);

      const conv = await mockDb.collection('conversations').doc('event_existing-event').get();
      expect(conv.data().participants).toEqual(['host-1', 'guest-1']);
    });

    test('does not duplicate the caller when already a participant', async () => {
      await request(app)
        .post('/api/chat/group/existing-event')
        .send({ userId: 'host-1', userName: 'Host', userProfilePic: '' });

      const conv = await mockDb.collection('conversations').doc('event_existing-event').get();
      expect(conv.data().participants).toEqual(['host-1']);
    });
  });
});
