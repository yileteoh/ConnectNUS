// frontend/app/(tabs)/profile.js
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  Linking,
  TouchableOpacity,
  View,
  Platform,
  StatusBar
} from 'react-native';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import Header from '../../components/Header';
import { auth } from '../../firebaseConfig';
import { getUserProfile } from '../../services/profileService';
import { fetchGlobalEvents } from '../../services/eventService';

const formatRelativeTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pastEvents, setPastEvents] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchProfileData = async () => {
        setLoading(true);
        try {
          const userId = auth.currentUser?.uid;
          if (!userId) return;

          // 1. Fetch Profile
          const data = await getUserProfile(userId);
          
          // 2. Fetch Events to find past attended sessions
          const allEvents = await fetchGlobalEvents();
          const now = new Date().getTime();
          
          const history = allEvents.filter(event => {
            let eventTime = 0;
            if (event.time) {
              if (typeof event.time === 'string' || typeof event.time === 'number') {
                eventTime = new Date(event.time).getTime();
              } else if (event.time.seconds) {
                eventTime = event.time.seconds * 1000;
              }
            }
            if (isNaN(eventTime)) eventTime = 0;
            const isAttending = (event.creatorId === userId) || (event.attendees?.some(a => a.uid === userId || a === userId));
            // Event must be in the past AND user must have attended
            return isAttending && eventTime <= now;
          });

          // Sort by newest past event first and get top 5
          history.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

          if (isActive) {
            setProfile(data);
            setPastEvents(history.slice(0, 5));
          }
        } catch (error) {
          console.error('Failed to fetch profile in UI:', error);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      fetchProfileData();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const displayName = profile?.name || auth.currentUser?.email?.split('@')[0] || 'Student';

  const handleShare = async () => {
    await Share.share({
      message: `${displayName} on ConnectNUS\nModules: ${(profile?.modules || []).join(', ') || 'Not added yet'}\nInterests: ${(profile?.interests || []).join(', ') || 'Not added yet'}`,
    });
  };

// Open any specific external link from the array safely
  const handleOpenLink = async (rawUrl) => {
    let url = rawUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch (error) {
      console.error("Failed to open link:", url, error);
    }
  };

if (loading && !profile) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Header showSettings={true} onSettingsPress={() => router.push('/settings')} />
      <View style={styles.absoluteCenterContainer}>
        <ActivityIndicator size="large" color="#002D5B" />
        <Text style={styles.fullscreenLoadingText}>Loading your profile...</Text>
      </View>
    </SafeAreaView>
  );
}

  if (!profile || profile.setupComplete !== true) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Header showSettings={true} onSettingsPress={() => router.push('/settings')} />
        <View style={styles.emptyContent}>
          <Ionicons name="person-circle-outline" size={80} color="#CCC" />
          <Text style={styles.emptyTitle}>Create your profile</Text>
          <Text style={styles.emptySub}>Tell us about yourself to find your perfect study buddy.</Text>
          <TouchableOpacity style={styles.btnPrimaryEmpty} onPress={() => router.push('/edit-profile')}>
            <Text style={styles.btnPrimaryText}>Create My Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getAvatarSource = () => {
  // If the user has a valid custom URL saved, use the network URI
  if (profile?.profilePicUrl && profile.profilePicUrl.trim() !== '') {
    return { uri: profile.profilePicUrl.trim() };
  }
  return require('../../assets/profile_image.jpg');
};

const getPlatformConfig = (url) => {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('linkedin.com')) {
    return { icon: 'logo-linkedin', color: '#0A66C2', label: 'LinkedIn' };
  }
  if (lowerUrl.includes('github.com')) {
    return { icon: 'logo-github', color: '#24292E', label: 'GitHub' };
  }
  if (lowerUrl.includes('instagram.com')) {
    return { icon: 'logo-instagram', color: '#E1306C', label: 'Instagram' };
  }
  if (lowerUrl.includes('t.me') || lowerUrl.includes('telegram.org')) {
    return { icon: 'paper-plane-outline', color: '#0088CC', label: 'Telegram' };
  }
  
  // Wildcard fallback for any other custom portfolio/website URLs
  return { icon: 'link-outline', color: '#002D5B', label: 'Website' };
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header showSettings={true} onSettingsPress={() => router.push('/settings')} />

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image source={getAvatarSource()} style={styles.mainAvatar} />
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons name="check-decagram" size={20} color="#F28C28" />
            </View>
          </View>

          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileSubtitle}>
            {profile.faculty || 'NUS'} • {profile.year || 'New Student'}
          </Text>

          {profile.buddyStatus ? (
            <View style={styles.buddyBadge}>
              <Ionicons name="people-outline" size={15} color="#A04000" />
              <Text style={styles.buddyBadgeText}>Open to buddy matching</Text>
            </View>
          ) : null}

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/edit-profile')}>
              <Text style={styles.btnPrimaryText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleShare}>
              <Text style={styles.btnSecondaryText}>Share Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionHeading}>Academic Profile</Text>
        <View style={styles.academicCard}>
          <Text style={styles.interestsLabel}>MODULES</Text>
          <View style={styles.chipsContainer}>
            {profile.modules?.length ? (
              profile.modules.map((moduleCode, index) => (
                <View key={`${moduleCode}-${index}`} style={styles.moduleChip}>
                  <Text style={styles.moduleChipText}>{moduleCode}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.placeholderText}>No modules added yet.</Text>
            )}
          </View>

          <Text style={styles.interestsLabel}>INTERESTS</Text>
          <View style={styles.chipsContainer}>
            {profile.interests?.length ? (
              profile.interests.map((interest, index) => (
                <View key={`${interest}-${index}`} style={styles.chip}>
                  <Text style={styles.chipText}>{interest}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.placeholderText}>No interests added yet.</Text>
            )}
          </View>
        </View>

        {(profile.bio || (profile.socialLinks && profile.socialLinks.length > 0)) ? (
          <View style={styles.aboutCard}>
            {profile.bio ? (
              <>
                <Text style={styles.interestsLabel}>BIO</Text>
                <Text style={styles.aboutText}>{profile.bio}</Text>
              </>
            ) : null}
            
            {profile.socialLinks && profile.socialLinks.length > 0 ? (
              <>
                <Text style={styles.interestsLabel}>SOCIAL PROFILES</Text>
                <View style={styles.socialGrid}>
                  {profile.socialLinks.map((link, index) => {
                    const config = getPlatformConfig(link);
                    return (
                      <TouchableOpacity 
                        key={`${link}-${index}`}
                        style={[styles.socialClickableRow, { borderColor: config.color + '40' }]} 
                        onPress={() => handleOpenLink(link)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={config.icon} size={18} color={config.color} />
                        <Text style={[styles.socialLinkButtonText, { color: config.color }]}>
                          {config.label}
                        </Text>
                        <Ionicons name="open-outline" size={12} color="#888" style={{ marginLeft: 6 }} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statCardDark}>
            <Ionicons name="book-outline" size={28} color="#FFF" style={styles.statIcon} />
            <Text style={styles.statNumberWhite}>{profile.modules?.length || 0}</Text>
            <Text style={styles.statLabelWhite}>Active Modules</Text>
          </View>
          <View style={styles.statCardOrange}>
            <Ionicons name="people-outline" size={28} color="#A04000" style={styles.statIcon} />
            <Text style={styles.statNumberDark}>{profile.buddyStatus ? 'On' : 'Off'}</Text>
            <Text style={styles.statLabelDark}>Buddy Status</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>My Badges</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
          <View style={styles.badgeItem}>
            <View style={[styles.badgeCircle, { borderColor: '#F28C28', backgroundColor: '#FFF5EB' }]}>
              <FontAwesome5 name="medal" size={24} color="#A04000" />
            </View>
            <Text style={styles.badgeLabel}>Top Mentor</Text>
          </View>
          <View style={styles.badgeItem}>
            <View style={[styles.badgeCircle, { borderColor: '#002D5B', backgroundColor: '#EBF4FA' }]}>
              <Ionicons name="book" size={24} color="#002D5B" />
            </View>
            <Text style={styles.badgeLabel}>Resource King</Text>
          </View>
          <View style={styles.badgeItem}>
            <View style={[styles.badgeCircle, { borderColor: '#CCC', backgroundColor: '#F9F9F9' }]}>
              <Ionicons name="calendar" size={24} color="#666" />
            </View>
            <Text style={styles.badgeLabel}>Early Bird</Text>
          </View>
        </ScrollView>

        <Text style={styles.sectionHeading}>Past Sessions</Text>
        {pastEvents.length > 0 ? (
          pastEvents.map((event) => (
            <TouchableOpacity 
              key={event.id} 
              style={styles.listCard}
              activeOpacity={0.8}
              onPress={() => router.push(`/event-details/${event.id}`)}
            >
              <View style={styles.cardHeaderBetween}>
                <View style={styles.tagLightBlue}>
                  <Text style={styles.tagTextDark}>{event.category}</Text>
                </View>
                <Text style={styles.timeText}>{formatRelativeTime(event.time)}</Text>
              </View>
              <Text style={styles.listCardTitle}>{event.title}</Text>
              <Text style={styles.listCardSubtitle}>
                <Ionicons name="location-outline" size={14} /> {event.location}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyPastSessions}>
             <Ionicons name="time-outline" size={30} color="#CCC" style={{marginBottom: 8}} />
             <Text style={styles.placeholderText}>You have not attended any events yet.</Text>
          </View>
        )}
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
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  absoluteCenterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  fullscreenLoadingText: {
    marginTop: 12,
    color: '#002D5B',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#002D5B',
    marginTop: 15,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  btnPrimaryEmpty: {
    backgroundColor: '#002D5B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  placeholderText: {
    color: '#999',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  mainAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 2,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#002D5B',
    marginBottom: 4,
  },
  profileSubtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  buddyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5EB',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 18,
  },
  buddyBadgeText: {
    color: '#A04000',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#002D5B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  btnPrimaryText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#002D5B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#002D5B',
    fontWeight: '600',
    fontSize: 14,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#002D5B',
    marginBottom: 12,
    marginTop: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  viewAllText: {
    color: '#555',
    fontSize: 14,
  },
  academicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  aboutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  interestsLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#A04000',
    marginBottom: 10,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  chip: {
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: '#333',
    fontSize: 13,
    fontWeight: '500',
  },
  moduleChip: {
    backgroundColor: '#E0E8F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  moduleChipText: {
    color: '#002D5B',
    fontSize: 13,
    fontWeight: '700',
  },
  aboutText: {
    color: '#333',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  socialText: {
    color: '#002D5B',
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCardDark: {
    flex: 1,
    backgroundColor: '#002D5B',
    padding: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  statCardOrange: {
    flex: 1,
    backgroundColor: '#F28C28',
    padding: 16,
    borderRadius: 8,
  },
  statIcon: {
    marginBottom: 15,
  },
  statNumberWhite: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  statLabelWhite: {
    fontSize: 13,
    color: '#D0E3F5',
  },
  statNumberDark: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#703000',
    marginBottom: 2,
  },
  statLabelDark: {
    fontSize: 13,
    color: '#703000',
  },
  badgesScroll: {
    marginBottom: 25,
  },
  badgeItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 70,
  },
  badgeCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeLabel: {
    fontSize: 11,
    color: '#444',
    textAlign: 'center',
    fontWeight: '500',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  cardHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tagLightBlue: {
    backgroundColor: '#E0E8F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagTextDark: {
    color: '#002D5B',
    fontSize: 12,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 13,
    color: '#666',
  },
  listCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#002D5B',
    marginBottom: 4,
  },
  listCardSubtitle: {
    fontSize: 14,
    color: '#555',
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  socialClickableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderRadius: 20, // Circular pill style looks cleaner for multiple links
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  socialLinkButtonText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
});
