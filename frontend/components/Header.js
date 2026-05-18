// frontend/components/Header.js
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Header() {
  return (
    <View style={styles.headerContainer}>
      {/* Left section: Profile Image */}
      <View style={styles.headerLeft}>
        <Image 
          source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} 
          style={styles.profileImage} 
        />
      </View>

      {/* Center section: Logo */}
      <View style={styles.headerCenter}>
        <Image 
          source={require('../assets/logo.png')} // Path to logo
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      {/* Right section: Notification Icon */}
      <View style={styles.headerRight}>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={28} color="#002D5B" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#FAFAFA',
    position: 'relative', // Required to allow absolute positioning for center child
    height: 70, // Fixed height keeps header height identical across all screens
    marginBottom: -5, // Adds spacing below the header
  },
  headerLeft: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 1, // Ensures the profile image button remains clickable
  },
  headerRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 1, // Ensures the notification button remains clickable
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
  },
  logoImage: {
    width: 170, 
    height: 150, 
  }
});