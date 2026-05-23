// frontend/app/user/[id].js
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, SafeAreaView, 
  ActivityIndicator, TouchableOpacity, Alert, Platform, StatusBar 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { getUserProfile } from '../../services/profileService';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams(); // Extracted matching peer's UID from router route
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Synchronize target profile parameters upon page activation
  useEffect(() => {
    const loadPeerProfile = async () => {
      try {
        const data = await getUserProfile(id); // Reuses your centralized service utility
        setProfile(data);
      } catch (error) {
        Alert.alert('Profile Error', 'Could not index profile details for this peer.');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadPeerProfile();
  }, [id, router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#002D5B" />
      </SafeAreaView>
    );
  }

  // Fallback fallback if dataset returns blank attributes
  const displayName = profile?.name || 'ConnectNUS Student';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top navbar controls */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#002D5B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile Card Summary Context */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userSubtitle}>
            {profile?.faculty || 'NUS'} • Year {profile?.year || '1'}
          </Text>
          {profile?.bio ? <Text style={styles.bioText}>"{profile.bio}"</Text> : null}
        </View>

        {/* Section Block: Enrolled Academic Curriculum */}
        <Text style={styles.sectionTitle}>Current Modules</Text>
        <View style={styles.tagsContainer}>
          {profile?.modules?.length > 0 ? (
            profile.modules.map((mod) => (
              <View key={mod} style={styles.moduleTag}>
                <Text style={styles.tagText}>{mod}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No academic modules populated yet.</Text>
          )}
        </View>

        {/* Section Block: Interpersonal Interests */}
        <Text style={styles.sectionTitle}>Interests & Hobbies</Text>
        <View style={styles.tagsContainer}>
          {profile?.interests?.length > 0 ? (
            profile.interests.map((interest) => (
              <View key={interest} style={styles.interestTag}>
                <Text style={styles.interestTagText}>{interest}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No personal interest areas specified.</Text>
          )}
        </View>

        {/* Section Block: Digital Footprint Networks */}
        <Text style={styles.sectionTitle}>Social Contact Links</Text>
        <View style={styles.socialCard}>
          {profile?.socialLinks?.length > 0 ? (
            profile.socialLinks.map((link, idx) => {
              const isTelegram = !link.includes('@') && !link.includes('http');
              return (
                <View key={idx} style={styles.socialItem}>
                  <FontAwesome5 
                    name={isTelegram ? "telegram" : "link"} 
                    size={18} 
                    color="#002D5B" 
                    style={{ marginRight: 12 }} 
                  />
                  <Text style={styles.socialLinkText} numberOfLines={1}>{link}</Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>This peer has kept social channels private.</Text>
          )}
        </View>

        {/* Future expansion slot placeholder for Feature 4: Matching */}
        <TouchableOpacity style={styles.actionConnectBtn}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.actionConnectBtnText}>Send Buddy Request</Text>
        </TouchableOpacity>

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
  container: { flex: 1, padding: 20 },
  profileCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#EAEAEA', marginBottom: 25 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#002D5B', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarInitial: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#002D5B', marginBottom: 4 },
  userSubtitle: { fontSize: 14, color: '#666', fontWeight: '600', marginBottom: 12 },
  bioText: { fontSize: 14, fontStyle: 'italic', color: '#555', textAlign: 'center', paddingHorizontal: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#002D5B', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 25 },
  moduleTag: { backgroundColor: '#E0E8F5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginRight: 8, marginBottom: 8 },
  tagText: { color: '#002D5B', fontSize: 13, fontWeight: '700' },
  interestTag: { backgroundColor: '#FFF5EB', borderWidth: 1, borderColor: '#F28C28', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  interestTagText: { color: '#F28C28', fontSize: 13, fontWeight: '600' },
  socialCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#EAEAEA', marginBottom: 30 },
  socialItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  socialLinkText: { fontSize: 14, color: '#333', fontWeight: '500' },
  emptyText: { fontSize: 14, color: '#999', fontStyle: 'italic' },
  actionConnectBtn: { backgroundColor: '#F28C28', flexDirection: 'row', paddingVertical: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  actionConnectBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' }
});