import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  SafeAreaView, Platform, StatusBar, ActivityIndicator, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

export default function NotificationsScreen() {
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid;
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch notifications in real-time
  useEffect(() => {
    if (!currentUserId) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUserId),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotifications(docs);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching notifications:', err);
      setLoading(false);
    });

    return unsub;
  }, [currentUserId]);

  // Handle clicking a notification
  const handlePress = async (item) => {
    // 1. Mark as read in Firestore
    if (!item.isRead) {
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === item.id ? { ...notification, isRead: true } : notification
        )
      );

      try {
        await updateDoc(doc(db, 'notifications', item.id), { isRead: true });
      } catch (error) {
        console.error('Error marking notification as read:', error);
        setNotifications((current) =>
          current.map((notification) =>
            notification.id === item.id ? { ...notification, isRead: false } : notification
          )
        );
      }
    }

    if (item.type === 'event_cancelled' || item.title === 'Event Cancelled') {
      Alert.alert('Event Cancelled', 'This event has been dissolved and is no longer available.');
      return;
    }

    // 2. Navigate based on notification type
    switch (item.type) {
      case 'event':
        if (item.referenceId) router.push(`/event-details/${item.referenceId}`);
        break;
      case 'forum':
        router.push(`/forum-details/${item.referenceId}`);
        break;
      case 'buddy':
        router.push(`/user/${item.referenceId}`); 
        break;
      default:
        break;
    }
  };

  // Select icon and color based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'chat': return { name: 'chatbubble-ellipses', color: '#0288D1' };
      case 'event': return { name: 'calendar', color: '#2E7D32' };
      case 'event_cancelled': return { name: 'calendar-clear', color: '#2E7D32' };
      case 'forum': return { name: 'megaphone', color: '#E53935' };
      case 'buddy': return { name: 'people', color: '#F28C28' };
      default: return { name: 'notifications', color: '#666' };
    }
  };

  const renderItem = ({ item }) => {
    const { name, color } = getNotificationIcon(item.type);
    
    return (
      <TouchableOpacity 
        style={[styles.notificationCard, !item.isRead && styles.unreadCard]} 
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconCircle, { backgroundColor: `${color}15` }]}>
          <Ionicons name={name} size={24} color={color} />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, !item.isRead && styles.unreadText]}>
            {item.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.time}>
            {item.createdAt ? new Date(item.createdAt.toMillis()).toLocaleString() : 'Just now'}
          </Text>
        </View>

        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#002D5B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} /> 
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#002D5B" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={60} color="#CCC" />
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySub}>You do not have any notifications right now.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EAEAEA' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#002D5B' },

  listContent: { paddingVertical: 8 },
  emptyContainer: { flex: 1 },

  notificationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  unreadCard: { backgroundColor: '#F4F8FB' },
  
  iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  
  textContainer: { flex: 1, marginRight: 8 },
  title: { fontSize: 15, color: '#333', marginBottom: 4 },
  unreadText: { fontWeight: 'bold', color: '#000' },
  body: { fontSize: 14, color: '#666', lineHeight: 20 },
  time: { fontSize: 12, color: '#999', marginTop: 6 },
  
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E53935' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#002D5B', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#666', marginTop: 6, textAlign: 'center', lineHeight: 20 },
});
