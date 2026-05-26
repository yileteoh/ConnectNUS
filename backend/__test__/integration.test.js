// backend/__tests__/integration.test.js
const request = require('supertest');
const app = require('../server'); // Import your Express server

describe('Integration Testing', () => {
  
  // Test 1: Fetching all forums
  it('GET /api/forums - should fetch all forums successfully', async () => {
    const response = await request(app).get('/api/forums');
    
    // Expect the HTTP status code to be 200 (OK)
    expect(response.statusCode).toBe(200);
    
    // Expect the response body to have a 'success' status
    expect(response.body.status).toBe('success');
    
    // Expect the data to be an array
    expect(Array.isArray(response.body.data)).toBeTruthy();
  });

  // Test 2: Error handling for invalid route
  it('GET /api/invalid-route - should return 404', async () => {
    const response = await request(app).get('/api/invalid-route');
    expect(response.statusCode).toBe(404);
  });

});