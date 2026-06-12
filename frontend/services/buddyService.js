// frontend/services/buddyService.js
import Constants from 'expo-constants';

const BASE_URL = Constants.expoConfig?.extra?.backendUrl || 'http://YOUR_LOCAL_IP:3000';

// Get personalized buddy recommendations
export const getBuddyRecommendations = async (userId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/buddy/recommendations/${userId}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    return result.data || [];
  } catch (error) {
    throw error;
  }
};

// Check relation status between two users
export const checkBuddyStatus = async (currentUserId, targetUserId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/buddy/status?currentUserId=${currentUserId}&targetUserId=${targetUserId}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    return result.data; // { relation: 'none' | 'pending_sent' | 'pending_received' | 'buddies', requestId?: string }
  } catch (error) {
    throw error;
  }
};

// Send a buddy request
export const sendBuddyRequest = async (senderId, receiverId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/buddy/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId, receiverId })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || result.error);
    return result;
  } catch (error) {
    throw error;
  }
};

// Accept a buddy request
export const acceptBuddyRequest = async (requestId, senderId, receiverId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/buddy/accept`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, senderId, receiverId })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || result.error);
    return result;
  } catch (error) {
    throw error;
  }
};

// Remove buddy
export const removeBuddy = async (userId, buddyId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/buddy/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, buddyId })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || result.error);
    return result;
  } catch (error) {
    throw error;
  }
};

// Fetch pending incoming requests
export const getPendingRequests = async (userId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/buddy/requests/${userId}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    return result.data || [];
  } catch (error) {
    throw error;
  }
};

// Fetch current exclusive buddy profile
export const getMyBuddyProfile = async (userId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/buddy/mybuddy/${userId}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    return result.data; // Returns null if no buddy
  } catch (error) {
    throw error;
  }
};