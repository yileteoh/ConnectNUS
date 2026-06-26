// frontend/app/event.js
import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Image,
  TextInput,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import { useRouter, useFocusEffect } from 'expo-router';
import { fetchGlobalEvents } from '../../services/eventService';
import { EVENT_CATEGORIES } from '../../constants/eventOptions';
import { auth } from '../../firebaseConfig';

// Format the ISO time string back to a readable UI format
const formatEventTime = (isoString) => {
  if (!isoString) return 'Time TBD';
  const date = new Date(isoString);
  const formattedDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const formattedTime = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${formattedDate}, ${formattedTime}`;
};

export default function EventScreen() {
  
  const router = useRouter();

  const currentUserId = auth.currentUser?.uid;

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All Events');
  const [searchQuery, setSearchQuery] = useState('');

  const filterTabs = ['All Events', ...EVENT_CATEGORIES];

  // Core fetching logic
  const loadEvents = async (categoryFilter = activeCategory) => {
    try {
      const data = await fetchGlobalEvents(categoryFilter);
      setEvents(data);
    } catch (error) {
      console.error('Failed to load events in UI:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadEvents(activeCategory);
    }, [activeCategory])
  );

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents(activeCategory);
  }, [activeCategory]);

  // Handle clicking a category chip
  const handleCategorySwitch = (category) => {
    if (category === activeCategory) return;
    setActiveCategory(category);
    setLoading(true);
  };

  const filteredEvents = events.filter(event => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = event.title && event.title.toLowerCase().includes(query);
    
    let eventTime = 0;
    if (event.time) {
      eventTime = new Date(event.time).getTime();
    }
    if (isNaN(eventTime)) eventTime = 0;

    const isFuture = eventTime > new Date().getTime();

    return matchesSearch && isFuture;
  });

  const renderEvent = ({ item: event }) => {
    // Calculate capacity progress
    const currentCount = event.attendees?.length || 0;
    const maxCount = event.capacity || 1;
    const isFull = currentCount >= maxCount;
    const fillPercentage = Math.min((currentCount / maxCount) * 100, 100);

    return (
      <TouchableOpacity 
        key={event.id} 
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => router.push(`../event-details/${event.id}`)} 
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>
          <View style={[styles.badge, isFull ? styles.badgeFull : styles.badgeNormal]}>
            <Text style={styles.badgeText}>{isFull ? 'FULL' : event.category}</Text>
          </View>
        </View>

        {event.description ? (
          <Text style={styles.descriptionText} numberOfLines={2}>{event.description}</Text>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#444" />
          <Text style={styles.infoText} numberOfLines={1}>{event.location}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color="#444" />
          <Text style={styles.infoText}>{formatEventTime(event.time)}</Text>
        </View>

        <View style={styles.cardBottomRow}>
          {/* Avatar Stack Placeholder */}
          <View style={styles.avatarStack}>
            {event.creatorPicUrl ? (
              <Image 
                source={{ uri: event.creatorPicUrl }} 
                style={styles.stackedAvatarImage} 
              />
            ) : (
              <Image 
                source={require('../../assets/profile_image.jpg')}
                style={styles.stackedAvatarImage} 
              />
            )}
            <Text style={styles.organizerText}>
              {event.creatorId === currentUserId ? 'You' : (event.creatorName || 'Host')} + {Math.max(0, currentCount - 1)}
            </Text>
          </View>

          {/* Progress Bar Info */}
          <View style={styles.progressContainer}>
            <Text style={[styles.progressText, isFull && styles.progressTextFull]}>
              {currentCount}/{maxCount} joined
            </Text>
            <View style={styles.progressBarTrack}>
              <View style={[
                styles.progressBarFill, 
                { width: `${fillPercentage}%`, backgroundColor: isFull ? '#D32F2F' : '#002D5B' }
              ]} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Events" showSettings={false} />

      {/* Search Bar (Static for now, can implement filtering later) */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search events..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Dynamic Filter Categories */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: 15 }}>
          {filterTabs.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <TouchableOpacity 
                key={cat}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => handleCategorySwitch(cat)}
              >
                <Text style={isActive ? styles.filterChipTextActive : styles.filterChipText}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Events Feed */}
      <FlatList 
        style={styles.feedContainer} 
        contentContainerStyle={{ paddingBottom: 80 }}
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent} // Connect the render function
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#002D5B" />
        }
        // Handle empty states directly within FlatList
        ListEmptyComponent={() => {
          if (loading && !refreshing) {
            return (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color="#002D5B" />
                <Text style={styles.loadingText}>Loading campus activities...</Text>
              </View>
            );
          }
          return (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-clear-outline" size={60} color="#CCC" />
              <Text style={styles.emptyStateTitle}>No events found</Text>
              <Text style={styles.emptyStateSub}>Be the first to host something for {activeCategory}!</Text>
            </View>
          );
        }}
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/create-event')}>
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#FAFAFA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 10,
    paddingHorizontal: 12, height: 45, marginHorizontal: 15, marginTop: 10, marginBottom: 15
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  
  /* Filter Categories */
  filterScroll: { marginBottom: 15, maxHeight: 40 },
  filterChip: {
    backgroundColor: '#EAEAEA', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, marginRight: 10, justifyContent: 'center', alignItems: 'center', height: 35
  },
  filterChipActive: { backgroundColor: '#002D5B' },
  filterChipText: { color: '#555', fontSize: 14, fontWeight: '500' },
  filterChipTextActive: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  /* Feed & Empty States */
  feedContainer: { flex: 1, paddingHorizontal: 15 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  loadingText: { marginTop: 12, color: '#666', fontSize: 14 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyStateTitle: { fontSize: 18, fontWeight: 'bold', color: '#002D5B', marginTop: 12 },
  emptyStateSub: { fontSize: 14, color: '#666', marginTop: 6, textAlign: 'center' },

  /* Event Cards Shared Styles */
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 15,
    borderWidth: 1, borderColor: '#EAEAEA', shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#002D5B', flex: 1, marginRight: 10, lineHeight: 22 },

  /* Badges */
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeNormal: { backgroundColor: '#EBF4FA' },
  badgeFull: { backgroundColor: '#FFEBEE' },
  badgeText: { color: '#002D5B', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  /* Card Info Rows */
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoText: { fontSize: 13, color: '#444', marginLeft: 8, flex: 1 },
  descriptionText: { fontSize: 14, color: '#666', marginBottom: 10, lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },

  /* Avatars & Bottom Info */
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 5 },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  stackedAvatarPlaceholder: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#A8C5E6',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF'
  },
  organizerText: { fontSize: 13, color: '#666', marginLeft: 8, fontWeight: '500' },

  /* Progress Bars */
  progressContainer: { alignItems: 'flex-end' },
  progressText: { fontSize: 12, fontWeight: 'bold', color: '#002D5B', marginBottom: 4 },
  progressTextFull: { color: '#D32F2F' },
  progressBarTrack: { height: 6, width: 80, backgroundColor: '#E0E0E0', borderRadius: 3 },
  progressBarFill: { height: '100%', borderRadius: 3 },

  /* Floating Action Button */
  fab: {
    position: 'absolute', bottom: 20, right: 20, width: 56, height: 56,
    borderRadius: 28, backgroundColor: '#F28C28', justifyContent: 'center', alignItems: 'center',
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5
  },
  stackedAvatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#EAEAEA'
  }
});
