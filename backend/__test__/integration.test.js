// backend/__tests__/integration.test.js
const request = require('supertest');
const app = require('../server'); // Import your Express server

describe('Integration Testing', () => {
  
  // Test 1: Fetching all forums
  test('GET /api/forums - should fetch all forums successfully', async () => {
    const response = await request(app).get('/api/forums');
    
    // Expect the HTTP status code to be 200 (OK)
    expect(response.statusCode).toBe(200);
    
    // Expect the response body to have a 'success' status
    expect(response.body.status).toBe('success');
    
    // Expect the data to be an array
    expect(Array.isArray(response.body.data)).toBeTruthy();
  });

  // Test 2: Error handling for invalid route
  test('GET /api/invalid-route - should return 404', async () => {
    const response = await request(app).get('/api/invalid-route');
    expect(response.statusCode).toBe(404);
  });

  // Test 3: Creating a new forum post
  let testForumId;

  test('POST /api/forums - should create a new discussion thread', async () => {
      const newPost = {
        title: "Integration Test Post",
        content: "Testing the API creation logic",
        category: "Study",
        creatorId: "test-user-id-123"
      };

      const response = await request(app)
        .post('/api/forums')
        .send(newPost);
      
      expect(response.statusCode).toBe(201); // 201 Created
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('id'); // Ensure Firestore generated an ID
      expect(response.body.data.title).toBe(newPost.title);
      testForumId = response.body.data.id; // Store the ID for cleanup
    });

  afterAll(async () => {
    if (testForumId) {
      await db.collection('forums').doc(testForumId).delete();
      console.log(`Cleaned up test forum post: ${testForumId}`);
    }
  });

});