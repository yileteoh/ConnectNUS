// frontend/app/_layout.js
import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="home" />
      <Stack.Screen name="register" />
      <Stack.Screen name="event" />
      <Stack.Screen name="forum" />
      <Stack.Screen name="buddy" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}