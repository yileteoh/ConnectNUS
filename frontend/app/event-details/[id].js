// frontend/app/event-details/[id].js
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator, SafeAreaView, Platform, StatusBar 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../firebaseConfig';
import { getEventDetails, joinEvent } from '../../services/eventService';

// Make the ISO time string human-readable
const formatEventTime = (isoString) => {
  if (!isoString) return 'Time TBD';
  const date = new Date(isoString);
  const formattedDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const formattedTime = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${formattedDate}, ${formattedTime}`;
};

export default function EventDetailsScreen() {
  // Extract the dynamic route parameter (the event ID)
  const { id } = useLocalSearchParams(); 
  const router = useRouter();
  
  // Local state management
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  
  const currentUserId = auth.currentUser?.uid;

  // Fetch the real-time event details
  const fetchDetails = useCallback(async () => {
    try {
      const data = await getEventDetails(id);
      setEvent(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load event details. It might have been deleted.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  // Load details immediately when the screen mounts
  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Handle the RSVP request
  const handleJoin = async () => {
    if (!currentUserId) {
      Alert.alert('Auth Error', 'Please log in to join events.');
      return;
    }

    setJoining(true);
    try {
      await joinEvent(id, currentUserId);
      Alert.alert('Success!', 'You have successfully secured a spot for this event!');
      fetchDetails(); // Refresh the page silently to update the attendee list and button state
    } catch (error) {
      Alert.alert('Join Failed', error.message || 'Could not join event.');
    } finally {
      setJoining(false);
    }
  };

  // Full-screen loading placeholder
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#002D5B" />
      </SafeAreaView>
    );
  }

  if (!event) return null;

  // Determine dynamic UI states based on the real-time attendees array
  const currentAttendees = event.attendees || [];
  const hasJoined = currentAttendees.includes(currentUserId);
  const isFull = currentAttendees.length >= event.capacity;

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Top Navigation Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#002D5B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        
        {/* Title and Category Badge */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{event.title}</Text>
          <View style={[styles.badge, isFull ? styles.badgeFull : styles.badgeNormal]}>
            <Text style={styles.badgeText}>{isFull ? 'FULL' : event.category}</Text>
          </View>
        </View>

        {/* Core Information Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#002D5B" />
            <Text style={styles.infoText}>{formatEventTime(event.time)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#002D5B" />
            <Text style={styles.infoText}>{event.location}</Text>
          </View>
        </View>

        {/* Context & Description */}
        <Text style={styles.sectionTitle}>About this event</Text>
        <View style={styles.descCard}>
          <Text style={styles.descText}>
            {event.description || 'No additional details provided by the host.'}
          </Text>
        </View>

        {/* Attendees Roster */}
        <View style={styles.attendeeHeader}>
          <Text style={styles.sectionTitle}>Attendees</Text>
          <Text style={styles.attendeeCount}>
            {currentAttendees.length} / {event.capacity} joined
          </Text>
        </View>
        
        <View style={styles.attendeeList}>
          {currentAttendees.map((uid, index) => (
            <TouchableOpacity 
              key={uid} 
              style={styles.avatarWrapper}
              // Route to the public profile (Next Step!)
              onPress={() => console.log('Navigate to user profile:', uid)}
            >
              <View style={styles.avatarPlaceholder}>
                {/* For now, just show 'Host' for the first person, and 'User' for the rest */}
                <Text style={styles.avatarText}>{index === 0 ? 'Host' : 'User'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      {/* Floating Bottom Action Bar for RSVP */}
      <View style={styles.bottomBar}>
        {hasJoined ? (
          <View style={[styles.joinButton, styles.joinedButton]}>
            <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.joinButtonText}>You're In!</Text>
          </View>
        ) : isFull ? (
          <View style={[styles.joinButton, styles.fullButton]}>
            <Text style={styles.joinButtonText}>Event Full</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.joinButton} 
            onPress={handleJoin}
            disabled={joining}
          >
            {joining ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.joinButtonText}>Request to Join</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#F0F0F0' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#002D5B' },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#002D5B', flex: 1, marginRight: 15, lineHeight: 30 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeNormal: { backgroundColor: '#EBF4FA' },
  badgeFull: { backgroundColor: '#FFEBEE' },
  badgeText: { color: '#002D5B', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 25, borderWidth: 1, borderColor: '#EAEAEA' },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 15, color: '#333', marginLeft: 12, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#002D5B', marginBottom: 10 },
  descCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 25, borderWidth: 1, borderColor: '#EAEAEA' },
  descText: { fontSize: 15, color: '#555', lineHeight: 22 },
  attendeeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  attendeeCount: { fontSize: 14, color: '#666', fontWeight: '600' },
  attendeeList: { flexDirection: 'row', flexWrap: 'wrap' },
  avatarWrapper: { marginRight: 10, marginBottom: 10 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#002D5B', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  avatarText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 15, borderTopWidth: 1, borderColor: '#EAEAEA', paddingBottom: Platform.OS === 'ios' ? 30 : 15 },
  joinButton: { backgroundColor: '#F28C28', flexDirection: 'row', borderRadius: 10, paddingVertical: 16, justifyContent: 'center', alignItems: 'center' },
  joinedButton: { backgroundColor: '#28A745' }, // Green for joined
  fullButton: { backgroundColor: '#CCCCCC' }, // Grey for full
  joinButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});