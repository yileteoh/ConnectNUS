// frontend/app/settings.js
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth } from '../firebaseConfig'; 
import { signOut } from 'firebase/auth';

// Define the menu items for the FlatList
const settingsData = [
  { id: '1', title: 'Edit Profile', icon: 'person-outline' },
  { id: '2', title: 'Notifications', icon: 'notifications-outline' },
  { id: '3', title: 'Privacy & Security', icon: 'lock-closed-outline' },
  { id: '4', title: 'Help & Support', icon: 'help-circle-outline' },
  // Notice the special color property for the destructive action
  { id: '5', title: 'Log Out', icon: 'log-out-outline', color: '#FF3B30' }, 
];

export default function SettingsScreen() {
  const router = useRouter();

  // Sign out function
  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to log out of ConnectNUS?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: () => {
            signOut(auth).catch((error) => Alert.alert("Error", error.message));
          }
        }
      ]
    );
  };

  // Handle item clicks based on their title or ID
  const handleItemPress = (item) => {
    if (item.title === 'Log Out') {
      handleSignOut();
    } else if (item.title === 'Edit Profile') {
      router.push('/edit-profile');
    } else {
      Alert.alert("Coming Soon", `${item.title} feature will be available later!`);
    }
  };

  // Render function for FlatList items
  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.menuItem} onPress={() => handleItemPress(item)}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={item.icon} size={22} color={item.color || "#333"} />
        <Text style={[styles.menuItemText, { color: item.color || "#333" }]}>
          {item.title}
        </Text>
      </View>
      {/* Don't show the right arrow for the Log Out button */}
      {item.title !== 'Log Out' && (
        <Ionicons name="chevron-forward" size={20} color="#CCC" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Simple Custom Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#002D5B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* The FlatList */}
      <FlatList
        data={settingsData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        // Add a separator line between items
        ItemSeparatorComponent={() => <View style={styles.separator} />} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA'
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#002D5B' },
  listContainer: { paddingVertical: 10 },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuItemText: { fontSize: 16, marginLeft: 15, fontWeight: '500' },
  separator: { height: 1, backgroundColor: '#EAEAEA', marginLeft: 55 } // Indented separator looks cleaner
});