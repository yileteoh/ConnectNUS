// frontend/services/forumService.js
import Constants from 'expo-constants';

const BASE_URL = Constants.expoConfig?.extra?.backendUrl || 'http://YOUR_LOCAL_IP:3000';

// Create a new forum post
export const createNewForumPost = async (postData) => {
  try {
    const response = await fetch(`${BASE_URL}/api/forums`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    return result.data;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};

// Fetch all forum posts, optionally filtered by category
export const fetchGlobalForums = async (category) => {
  try {
    let url = `${BASE_URL}/api/forums`;
    if (category && category !== 'All Topics') {
      url += `?category=${encodeURIComponent(category)}`;
    }

    const response = await fetch(url, { method: 'GET' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    return result.data || [];
  } catch (error) {
    console.error('Error fetching forums:', error);
    throw error;
  }
};

// Fetch all forum posts created by a specific user
export const togglePostLike = async (postId, userId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/forums/${postId}/toggle-like`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    return result;
  } catch (error) {
    throw error;
  }
};

// Fetch all forum posts bookmarked by a specific user
export const togglePostBookmark = async (postId, userId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/forums/${postId}/toggle-bookmark`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    return result;
  } catch (error) {
    throw error;
  }
};

// Fetch details of a specific forum post
export const getForumDetails = async (postId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/forums/${postId}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    return result.data;
  } catch (error) {
    throw error;
  }
};

// Fetch all comments for a specific forum post
export const getPostComments = async (postId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/forums/${postId}/comments`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    return result.data || [];
  } catch (error) {
    throw error;
  }
};

// Add a new comment to a specific forum post
export const addComment = async (postId, userId, text) => {
  try {
    const response = await fetch(`${BASE_URL}/api/forums/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, text }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    return result.data;
  } catch (error) {
    throw error;
  }
};

// Update a forum post
export const updateForumPost = async (postId, userId, updatedData) => {
  try {
    const response = await fetch(`${BASE_URL}/api/forums/${postId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...updatedData }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    return result;
  } catch (error) { throw error; }
};

// Delete a forum post
export const deleteForumPost = async (postId, userId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/forums/${postId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    return result;
  } catch (error) { throw error; }
};

// Update a comment on a forum post
export const updateComment = async (postId, commentId, userId, text) => {
  try {
    const response = await fetch(`${BASE_URL}/api/forums/${postId}/comments/${commentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, text }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    return result;
  } catch (error) { throw error; }
};

// Delete a comment on a forum post
export const deleteComment = async (postId, commentId, userId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/forums/${postId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    return result;
  } catch (error) { throw error; }
};

// Toggle like on a comment for a specific forum post
export const toggleCommentLike = async (postId, commentId, userId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/forums/${postId}/comments/${commentId}/toggle-like`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    return result;
  } catch (error) { 
    throw error; 
  }
};