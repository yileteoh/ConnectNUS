// frontend/app/event-details/[id].js
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator, SafeAreaView, Platform, StatusBar, Image 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../firebaseConfig';
import { getEventDetails, joinEvent, leaveEvent, deleteEvent } from '../../services/eventService';
import { ensureGroupConversation } from '../../services/chatService';
import * as Calendar from 'expo-calendar';
import {sendNotification} from '../../services/notificationService';

const formatEventTime = (isoString) => {
  if (!isoString) return 'Time TBD';
  const date = new Date(isoString);
  const formattedDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const formattedTime = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${formattedDate}, ${formattedTime}`;
};

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams(); 
  const router = useRouter();
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false); // Disables button spamming during operations
  
  const currentUserId = auth.currentUser?.uid;

  const fetchDetails = useCallback(async () => {
    try {
      const data = await getEventDetails(id);
      setEvent(data);
    } catch (error) {
      Alert.alert('Notice', 'This activity registry is no longer available.');
      router.replace('/(tabs)/event');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Self-Click Filter Router Interceptor
  const handleAttendeeNavigation = (attendeeUid) => {
    if (attendeeUid === currentUserId) {
      // If user clicks on themselves, reroute them back to their own fully editable profile tab dashboard
      router.push('/(tabs)/profile');
    } else {
      // If user clicks on a peer classmate, route to the dynamic public view-only page template
      router.push(`/user/${attendeeUid}`);
    }
  };

  // Join Event
  const handleJoin = async () => {
    if (!currentUserId) return;
    setActionLoading(true);
    try {
      await joinEvent(id, currentUserId);
      Alert.alert('Joined!', 'Your spot for this activity is officially secured.');
      fetchDetails(); 
    } catch (error) {
      Alert.alert('Failed to Join', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Leave Event with verification dialog
  const handleLeave = () => {
    Alert.alert(
      'Leave Event',
      'Are you sure you want to drop out of this event list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await leaveEvent(id, currentUserId);
              Alert.alert('Dropped Out', 'You have successfully left this event slot.');
              fetchDetails(); // Force reload interface metrics
            } catch (error) {
              Alert.alert('Error Leaving', error.message);
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  // Host Cancels Event with verification dialog
  const handleDelete = () => {
    Alert.alert(
      'Cancel Event',
      'This will cancel the event and notify all registered participants.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const participantsToNotify = currentAttendees.filter(a => a.uid !== currentUserId);
              await Promise.all(participantsToNotify.map(attendee => 
                sendNotification(
                  attendee.uid, // receiver
                  'Event Cancelled', // title
                  `The host has cancelled the upcoming event: "${event.title}".`, // body
                  'event', // type
                  id // referenceId
                ).catch(err => console.log('Notification failed for user:', attendee.uid, err))
              ));
              await deleteEvent(id, currentUserId);
              Alert.alert('Cancelled', 'Your event listing has been cancelled.', [
                { text: 'Back', onPress: () => router.replace('/(tabs)/event') }
              ]);
            } catch (error) {
              Alert.alert('Action Blocked', error.message);
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  // Export Event to Device Calendar
  const handleExportCalendar = async () => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need calendar permissions to save this event.');
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = Platform.OS === 'ios'
        ? calendars.find(cal => cal.isPrimary) || calendars[0]
        : calendars.find(cal => cal.accessLevel === Calendar.CalendarAccessLevel.OWNER) || calendars[0];

      if (!defaultCalendar) {
        Alert.alert('Error', 'No accessible calendar found on this device.');
        return;
      }

      const startDate = new Date(event.time);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      await Calendar.createEventAsync(defaultCalendar.id, {
        title: `[ConnectNUS] ${event.title}`,
        startDate: startDate,
        endDate: endDate,
        location: event.location,
        notes: event.description || 'Event via ConnectNUS',
        alarms: [{ relativeOffset: -60 }]
      });

      Alert.alert('Success!', 'Event has been added to your device calendar.');
    } catch (error) {
      console.error(error);
      Alert.alert('Export Failed', 'Could not save event to calendar.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#002D5B" />
      </SafeAreaView>
    );
  }

  if (!event) return null;

  const currentAttendees = event.attendees || [];
  const hasJoined = currentAttendees.some(attendee => attendee.uid === currentUserId);
  const isCreator = event.creatorId === currentUserId; // Validate roles mapping
  const isFull = currentAttendees.length >= event.capacity;

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Top Navigation Header (Upgraded with conditional trash icon) */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} disabled={actionLoading}>
          <Ionicons name="chevron-back" size={28} color="#002D5B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
        
        {/* If user is the creator, grant them a deletion tool trigger inside navbar */}
        {isCreator ? (
          <TouchableOpacity onPress={handleDelete} style={styles.trashButton} disabled={actionLoading}>
            <Ionicons name="trash-outline" size={24} color="#D32F2F" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 28 }} /> // Balanced UI spacer layout
        )}
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.titleRow}>
          <Text style={styles.title}>{event.title}</Text>
          <View style={[styles.badge, isFull ? styles.badgeFull : styles.badgeNormal]}>
            <Text style={styles.badgeText}>{isFull ? 'FULL' : event.category}</Text>
          </View>
        </View>

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

          <View style={styles.divider} />
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 5 }}
            onPress={handleExportCalendar}
          >
            <Ionicons name="calendar-outline" size={18} color="#F28C28" />
            <Text style={{ fontSize: 15, color: '#F28C28', marginLeft: 8, fontWeight: '600' }}>
              Add to Device Calendar
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>About this event</Text>
        <View style={styles.descCard}>
          <Text style={styles.descText}>
            {event.description || 'No additional details provided by the host.'}
          </Text>
        </View>

        <View style={styles.attendeeHeader}>
          <Text style={styles.sectionTitle}>Attendees</Text>
          <Text style={styles.attendeeCount}>
            {currentAttendees.length} / {event.capacity} joined
          </Text>
        </View>
        
        <View style={styles.attendeeList}>
          {currentAttendees.map((attendee, index) => (
            <TouchableOpacity 
              key={attendee.uid} 
              style={styles.avatarWrapper}
              onPress={() => handleAttendeeNavigation(attendee.uid)} // Bound to the self-click routing blocker
            >
              <View style={[styles.avatarCircleFrame, index === 0 && styles.avatarHostBorder]}>
                {attendee.profilePicUrl ? (
                  <Image source={{ uri: attendee.profilePicUrl }} style={styles.avatarImage} />
                ) : (
                  <Image source={require('../../assets/profile_image.jpg')} style={styles.avatarImage} /> // Local default assets image fallback
                )}
              </View>
              <Text style={styles.attendeeNameLabel} numberOfLines={1}>
                {attendee.uid === currentUserId ? 'You' : attendee.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View style={styles.bottomBar}>
        {isCreator ? (
          /* State A: Creator — Group Chat + Edit side by side */
          <View style={styles.bottomBarRow}>
            <TouchableOpacity
              style={[styles.joinButton, styles.chatButton, { flex: 1 }]}
              onPress={async () => {
                const me = currentAttendees.find(a => a.uid === currentUserId) || {};
                await ensureGroupConversation(id, event.title, currentUserId, me.name, me.profilePicUrl).catch(() => {});
                router.push(`/chat/event_${id}?name=${encodeURIComponent(event.title)}`);
              }}
            >
              <Ionicons name="chatbubbles-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.joinButtonText}>Group Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.joinButton, styles.hostButton, { flex: 1 }]}
              onPress={() => router.push(`/edit-event/${id}`)}
              disabled={actionLoading}
            >
              <Ionicons name="create-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.joinButtonText}>Edit Event</Text>
            </TouchableOpacity>
          </View>
        ) : hasJoined ? (
          /* State B: Attendee — Group Chat + Leave side by side */
          <View style={styles.bottomBarRow}>
            <TouchableOpacity
              style={[styles.joinButton, styles.chatButton, { flex: 1 }]}
              onPress={async () => {
                const me = currentAttendees.find(a => a.uid === currentUserId) || {};
                await ensureGroupConversation(id, event.title, currentUserId, me.name, me.profilePicUrl).catch(() => {});
                router.push(`/chat/event_${id}?name=${encodeURIComponent(event.title)}`);
              }}
            >
              <Ionicons name="chatbubbles-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.joinButtonText}>Group Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.joinButton, styles.leaveButton, { flex: 1 }]}
              onPress={handleLeave}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="exit-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.joinButtonText}>Leave Event</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : isFull ? (
          /* State C: Event slots are totally occupied */
          <View style={[styles.joinButton, styles.fullButton]}>
            <Text style={styles.joinButtonText}>Event Full</Text>
          </View>
        ) : (
          /* State D: Space is open, standard RSVP gate entry point */
          <TouchableOpacity
            style={styles.joinButton}
            onPress={handleJoin}
            disabled={actionLoading}
          >
            {actionLoading ? (
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
  trashButton: { padding: 4 }, // Aligned for top-right navigation control
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
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#A8C5E6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  avatarHostBorder: { backgroundColor: '#002D5B' }, // Set distinct color theme for event host organizer
  avatarText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 15, borderTopWidth: 1, borderColor: '#EAEAEA', paddingBottom: Platform.OS === 'ios' ? 30 : 15 },
  joinButton: { backgroundColor: '#F28C28', flexDirection: 'row', borderRadius: 10, paddingVertical: 16, justifyContent: 'center', alignItems: 'center' },
  fullButton: { backgroundColor: '#CCCCCC' }, 
  hostButton: { backgroundColor: '#002D5B' }, // Premium Navy color representing authorized ownership
  leaveButton: { backgroundColor: '#D32F2F' }, // Vibrant warning red color for drop-out triggers
  joinButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  attendeeNameLabel: { fontSize: 11, color: '#555555', textAlign: 'center', marginTop: 4, fontWeight: '500', width: 55, marginLeft: -3 },
  avatarCircleFrame: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    borderWidth: 2, 
    borderColor: '#EAEAEA', 
    overflow: 'hidden',
    backgroundColor: '#FAFAFA'
  },
  avatarHostBorder: { 
    borderColor: '#002D5B'
  }, 
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 15, borderTopWidth: 1, borderColor: '#EAEAEA', paddingBottom: Platform.OS === 'ios' ? 30 : 15 },
  bottomBarRow: { flexDirection: 'row', gap: 10 },
  joinButton: { backgroundColor: '#F28C28', flexDirection: 'row', borderRadius: 10, paddingVertical: 16, justifyContent: 'center', alignItems: 'center' },
  fullButton: { backgroundColor: '#CCCCCC' },
  hostButton: { backgroundColor: '#002D5B' },
  leaveButton: { backgroundColor: '#D32F2F' },
  chatButton: { backgroundColor: '#0288D1' },
  joinButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});