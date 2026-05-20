import React from 'react';
import { useRouter } from 'expo-router';
import ProfileForm from '../components/ProfileForm';

export default function ProfileSetupScreen() {
  const router = useRouter();

  return (
    <ProfileForm
      title="Set Up Your Profile"
      subtitle="Complete this once so ConnectNUS can personalize your experience."
      submitLabel="Save and Continue"
      allowCancel={false}
      onSaved={() => router.replace('/(tabs)/home')}
    />
  );
}
