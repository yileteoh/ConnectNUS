// frontend/services/profileService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

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
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      return normalizeProfile(docSnap.data());
    }

    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
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
    const userDocRef = doc(db, 'users', userId);

    await setDoc(
      userDocRef,
      {
        ...normalizedProfile,
        userId,
        profilePicUrl: normalizedProfile.profilePicUrl || DEFAULT_PROFILE_PIC_URL,
        isBuddy: normalizedProfile.buddyStatus,
        setupComplete: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await setCachedProfileSetupComplete(userId, true);
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
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
