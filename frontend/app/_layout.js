// frontend/app/_layout.js
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Auth screens */}
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
      
      {/* This points to the (tabs) folder. */}
      <Stack.Screen name="(tabs)" /> 
    </Stack>
  );
}