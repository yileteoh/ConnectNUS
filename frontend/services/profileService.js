// frontend/services/profileService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import Constants from 'expo-constants';

const BASE_URL = Constants.expoConfig?.extra?.backendUrl || 'http://YOUR_LOCAL_IP:3000';

export const DEFAULT_PROFILE_PIC_URL = 'https://randomuser.me/api/portraits/lego/1.jpg';

export const emptyProfile = {
  name: '',
  faculty: '',
  year: '',
  modules: [],
  interests: [],
  bio: '',
  profilePicUrl: '',
  socialLinks: '',
  buddyStatus: false,
  setupComplete: false,
};

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const profileSetupCacheKey = (userId) => `profileSetupComplete:${userId}`;

export const normalizeProfile = (profile = {}) => ({
  ...emptyProfile,
  ...profile,
  modules: normalizeList(profile.modules),
  interests: normalizeList(profile.interests),
  buddyStatus: Boolean(profile.buddyStatus ?? profile.isBuddy),
});

export const getUserProfile = async (userId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/profile/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.status === 404) {
      return null; // Profile doesn't exist yet
    }

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch profile from backend.');
    }

    return normalizeProfile(result.data);
  } catch (error) {
    console.error('Error fetching user profile via backend API:', error);
    throw error;
  }
};

export const getCachedProfileSetupComplete = async (userId) => {
  const cachedValue = await AsyncStorage.getItem(profileSetupCacheKey(userId));
  return cachedValue === 'true';
};

export const setCachedProfileSetupComplete = async (userId, isComplete) => {
  await AsyncStorage.setItem(profileSetupCacheKey(userId), isComplete ? 'true' : 'false');
};

export const updateUserProfile = async (userId, profileData) => {
  try {
    const normalizedProfile = normalizeProfile(profileData);
    
    // Call the PUT /api/profile endpoint in your server.js
    const response = await fetch(`${BASE_URL}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        ...normalizedProfile,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to update profile via backend.');
    }

    // Update local storage to bypass setup screen next time
    await setCachedProfileSetupComplete(userId, true);
    return true;
  } catch (error) {
    console.error('Error updating user profile via API:', error);
    throw error;
  }
};

export const isValidHttpUrl = (value) => {
  if (!value) return true;

  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};
