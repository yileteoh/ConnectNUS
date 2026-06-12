// frontend/app/user/[id].js
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, SafeAreaView, Image,
  ActivityIndicator, TouchableOpacity, Alert, Platform, StatusBar,
  Linking 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getUserProfile } from '../../services/profileService';
import { checkBuddyStatus, sendBuddyRequest, acceptBuddyRequest, removeBuddy, declineBuddyRequest } from '../../services/buddyService';
import { auth } from '../../firebaseConfig';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams(); 
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Buddy States
  const [relationStatus, setRelationStatus] = useState('none');
  const [requestId, setRequestId] = useState(null); 
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const loadPeerProfile = async () => {
      try {
        const data = await getUserProfile(id); 
        setProfile(data);

        // Fetch the relationship status between current user and this profile
        if (currentUserId && currentUserId !== id) {
          const statusData = await checkBuddyStatus(currentUserId, id);
          setRelationStatus(statusData.relation);
          if (statusData.requestId) setRequestId(statusData.requestId);
        }

      } catch (error) {
        Alert.alert('Profile Error', 'Could not index profile details for this peer.');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadPeerProfile();
  }, [id, currentUserId, router]);

// Send Request
  const handleSendRequest = async () => {
    setProcessing(true);
    try {
      const result = await sendBuddyRequest(currentUserId, id);
      if (result.requestId) {
        setRequestId(result.requestId); 
      }
      setRelationStatus('pending_sent');
      Alert.alert('Success!', 'Buddy request has been sent.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Cannot send request.');
    } finally {
      setProcessing(false);
    }
  };

  // Accept Request
  const handleAcceptRequest = async () => {
    setProcessing(true);
    try {
      await acceptBuddyRequest(requestId, id, currentUserId);
      setRelationStatus('buddies');
      Alert.alert('Matched!', `You and ${profile?.name} are now buddies!`);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeclineRequest = async () => {
    Alert.alert('Decline Request', 'Are you sure you want to decline this buddy request?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: async () => {
          setProcessing(true);
          try {
            await declineBuddyRequest(requestId);
            setRelationStatus('none');
          } catch (error) {
            Alert.alert('Error', error.message);
          } finally {
            setProcessing(false);
          }
      }}
    ]);
  };

  const handleCancelRequest = async () => {
    setProcessing(true);
    try {
      await declineBuddyRequest(requestId);
      setRelationStatus('none');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setProcessing(false);
    }
  };

  // Remove Buddy
  const handleRemoveBuddy = () => {
    Alert.alert('Remove Buddy', 'Are you sure you want to dissolve this 1-on-1 partnership?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
          setProcessing(true);
          try {
            await removeBuddy(currentUserId, id);
            setRelationStatus('none');
            Alert.alert('Removed', 'Partnership dissolved.');
          } catch (error) {
            Alert.alert('Error', error.message);
          } finally {
            setProcessing(false);
          }
      }}
    ]);
  };

  // Render Action Button
  const renderBuddyAction = () => {
    if (currentUserId === id) return null;

    switch (relationStatus) {
      case 'buddies':
        return (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#D32F2F' }]} onPress={handleRemoveBuddy} disabled={processing}>
             {processing ? <ActivityIndicator color="#FFF"/> : <Text style={styles.actionBtnText}>Remove Buddy</Text>}
          </TouchableOpacity>
        );
      case 'has_buddy':
        return (
          <View style={[styles.actionBtn, { backgroundColor: '#E0E0E0' }]}>
            <Ionicons name="lock-closed" size={18} color="#888" style={{ marginRight: 6 }} />
            <Text style={[styles.actionBtnText, { color: '#888' }]}>Already Paired</Text>
          </View>
        );
      case 'pending_sent':
        return (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFB74D' }]} onPress={handleCancelRequest} disabled={processing}>
            {processing ? <ActivityIndicator color="#FFF"/> : <Text style={styles.actionBtnText}>Cancel Request</Text>}
          </TouchableOpacity>
        );
      case 'pending_received':
        return (
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginHorizontal: 20, marginTop: 10 }}>
            <TouchableOpacity style={[styles.actionBtn, { flex: 1, marginRight: 10, backgroundColor: '#E0E0E0', marginTop: 0 }]} onPress={handleDeclineRequest} disabled={processing}>
              <Text style={[styles.actionBtnText, { color: '#333' }]}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: '#28A745', marginTop: 0 }]} onPress={handleAcceptRequest} disabled={processing}>
              {processing ? <ActivityIndicator color="#FFF"/> : <Text style={styles.actionBtnText}>Accept</Text>}
            </TouchableOpacity>
          </View>
        );
      default: // 'none'
        return (
          <TouchableOpacity style={styles.actionBtn} onPress={handleSendRequest} disabled={processing}>
            {processing ? <ActivityIndicator color="#FFF"/> : <Text style={styles.actionBtnText}>Send Buddy Request</Text>}
          </TouchableOpacity>
        );
    }
  };

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
    if (lowerUrl.includes('t.me') || lowerUrl.includes('telegram.org') || lowerUrl.startsWith('@')) {
      return { icon: 'paper-plane-outline', color: '#0088CC', label: 'Telegram' };
    }
    
    return { icon: 'link-outline', color: '#002D5B', label: 'Website' };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#002D5B" />
      </SafeAreaView>
    );
  }

  const displayName = profile?.name || 'ConnectNUS Student';

  return (
    <SafeAreaView style={styles.safeArea}>
      
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#002D5B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Top Profile Card (Identity Only) */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {profile?.profilePicUrl ? (
              <Image source={{ uri: profile.profilePicUrl }} style={styles.mainAvatar} />
            ) : (
              <Image source={require('../../assets/profile_image.jpg')} style={styles.mainAvatar} />
            )}
            {/* Verified badge synced from profile.js */}
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons name="check-decagram" size={20} color="#F28C28" />
            </View>
          </View>
          
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileSubtitle}>
            {profile?.faculty || 'NUS'} • {profile?.year || '1'}
          </Text>
          
          {profile?.buddyStatus ? (
            <View style={styles.buddyBadge}>
              <Ionicons name="people-outline" size={15} color="#A04000" />
              <Text style={styles.buddyBadgeText}>Open to buddy matching</Text>
            </View>
          ) : null}
        </View>

        {/* Academic Card */}
        <View style={styles.academicCard}>
          <Text style={styles.interestsLabel}>MODULES</Text>
          <View style={styles.chipsContainer}>
            {profile?.modules?.length > 0 ? (
              profile.modules.map((mod) => (
                <View key={mod} style={styles.moduleChip}>
                  <Text style={styles.moduleChipText}>{mod}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.placeholderText}>No academic modules populated yet.</Text>
            )}
          </View>

          <Text style={styles.interestsLabel}>INTERESTS</Text>
          <View style={styles.chipsContainer}>
            {profile?.interests?.length > 0 ? (
              profile.interests.map((interest) => (
                <View key={interest} style={styles.chip}>
                  <Text style={styles.chipText}>{interest}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.placeholderText}>No personal interest areas specified.</Text>
            )}
          </View>
        </View>

        {/* Extracted Bio and Social into About Card to match profile.js exactly and prevent text truncation */}
        {(profile?.bio || (profile?.socialLinks && profile.socialLinks.length > 0)) ? (
          <View style={styles.aboutCard}>
            {profile.bio ? (
              <>
                <Text style={styles.interestsLabel}>BIO</Text>
                {/* No height restrictions here, text will fully expand automatically */}
                <Text style={styles.aboutText}>{profile.bio}</Text>
              </>
            ) : null}
            
            {profile?.socialLinks && profile.socialLinks.length > 0 ? (
              <>
                <Text style={[styles.interestsLabel, profile.bio && { marginTop: 15 }]}>
                  SOCIAL PROFILES
                </Text>
                {/* Synced pill-shaped grid layout for social buttons */}
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

        <View style={{ paddingVertical: 20 }}>
          {renderBuddyAction()}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#F0F0F0' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#002D5B' },
  container: { flex: 1, padding: 15 },
  
  // Fully synced layout components from profile.js
  profileCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 20, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  mainAvatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#002D5B', backgroundColor: '#FAFAFA' },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FFF', borderRadius: 10, padding: 2 },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#002D5B', marginBottom: 4 },
  profileSubtitle: { fontSize: 14, color: '#555', marginBottom: 10 },
  buddyBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5EB', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 5 },
  buddyBadgeText: { color: '#A04000', fontSize: 12, fontWeight: '600', marginLeft: 5 },
  
  academicCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#EAEAEA' },
  aboutCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#EAEAEA' },
  interestsLabel: { fontSize: 12, fontWeight: 'bold', color: '#A04000', marginBottom: 10 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  chip: { backgroundColor: '#F0F2F5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8, marginBottom: 8 },
  chipText: { color: '#333', fontSize: 13, fontWeight: '500' },
  moduleChip: { backgroundColor: '#E0E8F5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8, marginBottom: 8 },
  moduleChipText: { color: '#002D5B', fontSize: 13, fontWeight: '700' },
  placeholderText: { color: '#999', fontSize: 13, fontStyle: 'italic', marginBottom: 10 },
  
  aboutText: { color: '#333', fontSize: 14, lineHeight: 20, marginBottom: 4 },
  
  socialGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  socialClickableRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 10, marginBottom: 10 },
  socialLinkButtonText: { fontSize: 13, fontWeight: '600', marginLeft: 6 },
  
  actionConnectBtn: { backgroundColor: '#F28C28', flexDirection: 'row', paddingVertical: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  actionConnectBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },

  actionBtn: { backgroundColor: '#F28C28', flexDirection: 'row', paddingVertical: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  actionBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' }
});