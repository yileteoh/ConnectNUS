// frontend/app/home.js
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Header from '../../components/Header';
import { auth } from '../../firebaseConfig';
import { useFocusEffect } from '@react-navigation/native';
import { getUserProfile } from '../../services/profileService';
import { fetchGlobalEvents } from '../../services/eventService';

const formatEventTime = (isoString) => {
  if (!isoString) return 'Time TBD';
  const date = new Date(isoString);
  const formattedDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const formattedTime = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${formattedDate}, ${formattedTime}`;
};

export default function HomeScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [recommendedEvents, setRecommendedEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchHomeProfileData = async () => {
        try {
          const userId = auth.currentUser?.uid;
          if (!userId) return;

          const profileData = await getUserProfile(userId);
          
          // 2. Fetch All Events
          const allEvents = await fetchGlobalEvents();
          const now = new Date().getTime();

          const recommended = [];
          const upcoming = [];

          // 3. Categorize Events logically
          allEvents.forEach(event => {
            const parsedTime = event.time ? new Date(event.time).getTime() : 0;
            const eventTime = isNaN(parsedTime) ? 0 : parsedTime; 

            const isAttending = (event.creatorId === userId) || 
                                (event.attendees?.some(a => a.uid === userId || a === userId));

            if (eventTime > now) {
              if (isAttending) {
                upcoming.push(event);
              } else {
                recommended.push(event); 
              }
            }
          });

          upcoming.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
          recommended.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

          if (isActive) {
            setProfile(profileData);
            setUpcomingEvents(upcoming.slice(0, 5));
            setRecommendedEvents(recommended.slice(0, 5));
          }
        } catch (error) {
          console.error('Failed to sync profile on home tab screen:', error);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      fetchHomeProfileData();

      return () => {
        isActive = false; // Teardown safeguard
      };
    }, [])
  );

  const welcomeName = profile?.name && profile.name.trim() !== ''
    ? profile.name
    : (auth.currentUser?.email ? auth.currentUser.email.split('@')[0] : 'Student');

  // Full-screen loading placeholder to guard uninitialized state renders beautifully
  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#002D5B" />
      </SafeAreaView>
    );
  }

  return (
    
    <SafeAreaView style={styles.safeArea}>

      {/* Header Section */}
      <Header showSettings={false} onNotificationPress={() => router.push('/(tabs)/chat')} />

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>

        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.welcomeTitle}>
            Hi, {welcomeName}!
          </Text>
          <Text style={styles.subTitle}>What are you looking for today?</Text>
        </View>

        {/* Quick Actions (3 buttons) */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/forum')}>
            <Ionicons name="chatbubbles-outline" size={32} color="#F28C28" style={styles.actionIcon} />
            <Text style={styles.actionText}>Forum</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/buddy')}>
            <Ionicons name="person-add-outline" size={32} color="#003D7C" style={styles.actionIcon} />
            <Text style={styles.actionText}>Buddy{"\n"}Match</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/event')}>
            <Ionicons name="calendar-outline" size={32} color="#8B4513" style={styles.actionIcon} />
            <Text style={styles.actionText}>Find{"\n"}Events</Text>
          </TouchableOpacity>
        </View>

        {/* Recommended Study Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended For You</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/event')}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {recommendedEvents.length > 0 ? (
            recommendedEvents.map((event) => (
              <TouchableOpacity 
                key={event.id} 
                style={styles.studyCard} 
                activeOpacity={0.9}
                onPress={() => router.push(`/event-details/${event.id}`)}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.badgeBlue}><Text style={styles.badgeTextWhite}>{event.category}</Text></View>
                  <Ionicons name="people" size={20} color="#F28C28" />
                </View>
                <Text style={styles.cardMainTitle} numberOfLines={1}>{event.title}</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.infoText}>{formatEventTime(event.time)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color="#666" />
                  <Text style={styles.infoText} numberOfLines={1}>{event.location}</Text>
                </View>
                <View style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>View Details</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyFeedText}>No new events available right now.</Text>
          )}
        </ScrollView>

        {/* Upcoming Events Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Upcoming Events</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => (
              <TouchableOpacity 
                key={event.id} 
                style={styles.upcomingCard}
                activeOpacity={0.9}
                onPress={() => router.push(`/event-details/${event.id}`)}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.badgeOrange}><Text style={styles.badgeTextWhite}>{event.category}</Text></View>
                  <Ionicons name="calendar" size={18} color="#F28C28" />
                </View>
                <Text style={styles.cardMainTitle} numberOfLines={1}>{event.title}</Text>
                
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.infoText}>{formatEventTime(event.time)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color="#666" />
                  <Text style={styles.infoText} numberOfLines={1}>{event.location}</Text>
                </View>
                
                <View style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>View Details</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyEventBox}>
              <Ionicons name="calendar-clear-outline" size={30} color="#CCC" />
              <Text style={styles.emptyFeedText}>You haven't joined any upcoming events.</Text>
            </View>
          )}
        </ScrollView>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressTextContainer}>
            <Text style={styles.progressTitle}>Your Progress</Text>
            <Text style={styles.progressSubtitle}>12 sessions completed this week!</Text>
            {/* Progress Bar Track */}
            <View style={styles.progressBarBackground}>
              {/* Progress Bar Fill */}
              <View style={styles.progressBarFill} />
            </View>
          </View>
          <View style={styles.progressIconContainer}>
            <FontAwesome5 name="award" size={32} color="#FFF" />
          </View>
        </View>

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#FAFAFA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA'
  },
  container: { 
    flex: 1, 
    paddingHorizontal: 20 
  },
  
  /* Greeting Styles */
  greetingSection: {
    marginTop: 10,
    marginBottom: 20
  },
  welcomeTitle: { 
    fontSize: 24, 
    fontWeight: 'bold',
    color: '#002D5B' 
  },
  subTitle: { 
    fontSize: 16, 
    color: '#555', 
    marginTop: 5 
  },

  /* Quick Actions (3 buttons) */
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25
  },
  actionCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  actionIcon: {
    marginBottom: 10
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center'
  },

  /* Section Headers */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 10
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700',
    color: '#000'
  },
  seeAllText: {
    fontSize: 14,
    color: '#002D5B',
    fontWeight: '600'
  },

  /* Horizontal Scroll Layouts */
  horizontalScroll: {
    marginHorizontal: -20, // allows cards to scroll edge-to-edge
    paddingHorizontal: 20,
    marginBottom: 25
  },

  /* Study Card Styles */
  studyCard: {
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  upcomingCard: { 
    width: 260, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 18, 
    marginRight: 15, 
    borderWidth: 1, 
    borderColor: '#EAEAEA',
    borderLeftWidth: 5,
    borderLeftColor: '#F28C28',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  badgeBlue: {
    backgroundColor: '#002D5B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  badgeOrange: {
    backgroundColor: '#F28C28',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  badgeTextWhite: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600'
  },
  cardMainTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#002D5B',
    marginBottom: 10
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 6
  },
  primaryButton: {
    backgroundColor: '#002D5B',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 15
  },
  primaryButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14
  },

  /* Event Card Styles */
  eventCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    overflow: 'hidden'
  },
  eventImage: {
    width: '100%',
    height: 120,
  },
  badgeOrangeAbsolute: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#B85000',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  eventCardContent: {
    padding: 16
  },

  /* Progress Card Styles */
  progressCard: {
    backgroundColor: '#001E3D',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30
  },
  progressTextContainer: {
    flex: 1,
    marginRight: 15
  },
  progressTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4
  },
  progressSubtitle: {
    color: '#D0D0D0',
    fontSize: 14,
    marginBottom: 15
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#1E3A5F',
    borderRadius: 3,
    width: '100%'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F28C28',
    borderRadius: 3,
    width: '60%' // Example percentage
  },
  progressIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F28C28',
    justifyContent: 'center',
    alignItems: 'center'
  },

});