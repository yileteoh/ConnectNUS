import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';

export default function Header({ showSettings, onSettingsPress, onNotificationPress }) {
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    let unsubSnap = () => {};
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubSnap();
      if (!user) return;
      const uid = user.uid;
      unsubSnap = onSnapshot(
        query(collection(db, 'conversations'), where('participants', 'array-contains', uid)),
        (snap) => {
          const any = snap.docs.some((d) => (d.data().unreadCounts?.[uid] || 0) > 0);
          setHasUnread(any);
        }
      );
    });
    return () => { unsubAuth(); unsubSnap(); };
  }, []);

  return (
    <View style={styles.headerContainer}>
      <Image
        source={require('../assets/logo.png')}
        style={styles.logoImage}
        resizeMode="contain"
      />

      <View style={styles.headerRight}>
        {showSettings ? (
          <TouchableOpacity onPress={onSettingsPress}>
            <Ionicons name="settings-outline" size={28} color="#002D5B" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onNotificationPress} style={styles.bellWrapper}>
            <Ionicons name="notifications-outline" size={28} color="#002D5B" />
            {hasUnread && <View style={styles.badge} />}
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
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    height: 64,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  headerRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    zIndex: 1,
  },
  logoImage: {
    width: 170,
    height: 150,
    marginLeft: -5,
  },
  bellWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E53935',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
