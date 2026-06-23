// frontend/app/_layout.js
import React, { useEffect, useState, createContext } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ActivityIndicator, View, AppState } from 'react-native';
import {
  getCachedProfileSetupComplete,
  getUserProfile,
  setCachedProfileSetupComplete,
} from '../services/profileService';
import { registerForPushNotificationsAsync } from '../services/notificationHelper';

// Create a global AuthContext to share the profile setup state across screens
export const AuthContext = createContext();

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const segments = useSegments(); // Tracks current routing position

  // Track online/offline status in Firestore so other users see "Active now" or "Last seen X"
  useEffect(() => {
    if (!user) return;

    // Capture uid now — auth.currentUser will be null by the time the cleanup runs on logout
    const uid = user.uid;

const initializeUserSession = async () => {
      try {
        await updateDoc(doc(db, 'users', uid), {
          isOnline: true,
          lastSeen: serverTimestamp(),
        });

        const token = await registerForPushNotificationsAsync();
        if (token) {
          await updateDoc(doc(db, 'users', uid), { pushToken: token });
        }
      } catch (e) {
        console.log("Failed to initialize user session:", e);
      }
    };

    initializeUserSession();

    const pingInterval = setInterval(async () => {
      try {
        await updateDoc(doc(db, 'users', uid), { isOnline: true, lastSeen: serverTimestamp() });
      } catch (e) {}
    }, 2 * 60 * 1000);

    const subscription = AppState.addEventListener('change', async (state) => {
      try {
        await updateDoc(doc(db, 'users', uid), { isOnline: state === 'active' });
      } catch (e) {}
    });
    
    return () => {
      clearInterval(pingInterval);
      try {
        updateDoc(doc(db, 'users', uid), { isOnline: false });
      } catch (e) {
      }
      subscription.remove();
      subscription.remove();
    };
  }, [user]);

  useEffect(() => {
    // Subscriber to listen to Firebase Authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
      setUser(authenticatedUser);
      setProfileComplete(false);

      if (!authenticatedUser) {
        setInitializing(false);
        return;
      }

      try {
        const cachedComplete = await getCachedProfileSetupComplete(authenticatedUser.uid);

        if (cachedComplete) {
          setProfileComplete(true);
          setInitializing(false);
          return;
        }

        const profile = await getUserProfile(authenticatedUser.uid);
        const isComplete = profile?.setupComplete === true;

        setProfileComplete(isComplete);
        if (isComplete) {
          await setCachedProfileSetupComplete(authenticatedUser.uid, true);
        }
      } catch (error) {
        console.error('Failed to check profile setup status:', error);
        setProfileComplete(false);
      } finally {
        setInitializing(false);
      }
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (initializing) return; // Do nothing while still checking Firebase state

    // Check if the user is in the auth group
    const inAuthGroup = segments[0] === 'index' || segments[0] === 'register' || segments.length === 0;
    const inProfileSetup = segments[0] === 'profile-setup';

    if (user && !profileComplete && !inProfileSetup && segments[0] !== 'register') {
      // First login after registration must complete profile setup.
      router.replace('/profile-setup');
    } else if (user && profileComplete && (inAuthGroup || inProfileSetup)) {
      router.replace('/(tabs)/home');
    } else if (!user && !inAuthGroup) {
      // If NOT logged in and trying to access tabs, redirect to login
      router.replace('/');
    }
  }, [user, profileComplete, initializing, segments, router]);

  // Show a simple loading spinner while checking auth state initially
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#002D5B" />
      </View>
    );
  }

  return (

    <AuthContext.Provider value={{ setProfileComplete }}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth screens */}
        <Stack.Screen name="index" />
        <Stack.Screen name="register" />
        <Stack.Screen name="profile-setup" />
        <Stack.Screen name="edit-profile" />
        
        {/* Main app screens (Tabs) */}
        <Stack.Screen name="(tabs)" /> 

        {/* Settings screen accessible from Profile tab */}
        <Stack.Screen name="settings" />

      </Stack>
    </AuthContext.Provider>

  );
}
