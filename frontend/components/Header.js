// frontend/components/Header.js
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Header({ showSettings, onSettingsPress }) {
  return (
    <View style={styles.headerContainer}>
      {/* Left section: Logo */}
      <Image 
        source={require('../assets/logo.png')} // Path to logo
        style={styles.logoImage}
        resizeMode="contain"
      />

      {/* Right section: Notification or Settings Icon */}
      <View style={styles.headerRight}>
        {showSettings ? (
          <TouchableOpacity onPress={onSettingsPress}>
            <Ionicons name="settings-outline" size={28} color="#002D5B" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity>
            <Ionicons name="notifications-outline" size={28} color="#002D5B" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingTop: 8, // Comfortable spacing for status bar
    paddingBottom: 12,
    paddingHorizontal: 16, // Clean horizontal screen alignment inset
    backgroundColor: '#FFFFFF', // Pure crisp white header background
    height: 64, // Sleek, fixed high-end standard mobile navbar height
    borderBottomWidth: 1,
    borderColor: '#F0F0F0', // Very subtle divider line
  },
  headerRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 1, // Ensures the notification button remains clickable
  },
  logoImage: {
    width: 170, 
    height: 150, 
    marginLeft: -5,
  }
});