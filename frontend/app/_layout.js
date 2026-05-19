// frontend/app/_layout.js
import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, View } from 'react-native';

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const segments = useSegments(); // Tracks current routing position

  useEffect(() => {
    // Subscriber to listen to Firebase Authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (authenticatedUser) => {
      setUser(authenticatedUser);
      if (initializing) setInitializing(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (initializing) return; // Do nothing while still checking Firebase state

    // Check if the user is in the auth group
    const inAuthGroup = segments[0] === 'index' || segments[0] === 'register' || segments.length === 0;

    if (user && inAuthGroup) {
      // If logged in and on login/register page, redirect to home
      router.replace('/(tabs)/home');
    } else if (!user && !inAuthGroup) {
      // If NOT logged in and trying to access tabs, redirect to login
      router.replace('/');
    }
  }, [user, initializing, segments]);

  // Show a simple loading spinner while checking auth state initially
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#002D5B" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Auth screens */}
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
      
      {/* Main app screens (Tabs) */}
      <Stack.Screen name="(tabs)" /> 

      {/* Settings screen accessible from Profile tab */}
      <Stack.Screen name="settings" />

    </Stack>
  );
}