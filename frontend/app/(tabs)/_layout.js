// frontend/app/(tabs)/_layout.js
import { Tabs } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs 
      screenOptions={{ 
        headerShown: false,
        tabBarActiveTintColor: '#002D5B', 
        tabBarInactiveTintColor: '#666',  
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 5,
        }
      }}
    >
      <Tabs.Screen 
        name="home" 
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
        }} 
      />
      <Tabs.Screen 
        name="event" 
        options={{
          title: 'Event',
          tabBarIcon: ({ color }) => <MaterialIcons name="event" size={24} color={color} />,
        }} 
      />
      <Tabs.Screen 
        name="forum" 
        options={{
          title: 'Forum',
          tabBarIcon: ({ color }) => <Ionicons name="chatbubbles-outline" size={24} color={color} />,
        }} 
      />
      <Tabs.Screen 
        name="buddy" 
        options={{
          title: 'Buddy',
          tabBarIcon: ({ color }) => <Ionicons name="person-add-outline" size={24} color={color} />,
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }} 
      />
    </Tabs>
  );
}