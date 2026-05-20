import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../firebaseConfig';
import ProfileForm from '../components/ProfileForm';
import { getUserProfile } from '../services/profileService';

export default function EditProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const data = await getUserProfile(userId);
        setProfile(data);
      } catch (error) {
        console.error('Failed to load editable profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#002D5B" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <ProfileForm
      initialProfile={profile}
      title="Edit Profile"
      subtitle="Keep your modules, interests, and buddy status up to date."
      submitLabel="Save Changes"
      onCancel={() => router.back()}
      onSaved={() => router.replace('/(tabs)/profile')}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingText: {
    marginTop: 10,
    color: '#555',
    fontSize: 14,
  },
});
