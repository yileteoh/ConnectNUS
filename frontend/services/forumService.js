// frontend/services/forumService.js
import Constants from 'expo-constants';

const BASE_URL = Constants.expoConfig?.extra?.backendUrl || 'http://YOUR_LOCAL_IP:3000';

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