import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Platform, StatusBar, ActivityIndicator
} from 'react-native';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { auth } from '../firebaseConfig';
import { getUserProfile } from '../services/profileService';
import { BADGE_CATEGORIES, TIER_COLORS, getUnlockedTier, getProgressText } from '../constants/badges';

const BADGE_ICON_LIBS = { FontAwesome5, Ionicons, MaterialCommunityIcons };

export default function BadgesScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchProfile = async () => {
        setLoading(true);
        try {
          const userId = auth.currentUser?.uid;
          if (!userId) return;
          const data = await getUserProfile(userId);
          if (isActive) setProfile(data);
        } catch (error) {
          console.error('Failed to fetch profile for badges screen:', error);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      fetchProfile();
      return () => { isActive = false; };
    }, [])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#002D5B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Badges</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#002D5B" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {BADGE_CATEGORIES.map((category) => {
            const unlockedTier = getUnlockedTier(category.key, profile?.badges || []);
            const colors = TIER_COLORS[unlockedTier === 'unlocked' ? 'gold' : unlockedTier] || TIER_COLORS.locked;
            const IconComponent = BADGE_ICON_LIBS[category.iconLib];

            return (
              <View style={styles.card} key={category.key}>
                <View style={[styles.badgeCircle, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <IconComponent name={category.icon} size={26} color={colors.icon} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{category.name}</Text>
                  <Text style={styles.cardDescription}>{category.description}</Text>
                  <Text style={styles.cardProgress}>
                    {getProgressText(category, profile?.badgeCounts || {}, unlockedTier)}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
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

  listContent: { padding: 16 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#EAEAEA' },
  badgeCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  cardDescription: { fontSize: 12, color: '#666', lineHeight: 17, marginBottom: 4 },
  cardProgress: { fontSize: 12, color: '#999', fontWeight: '500' },
});
