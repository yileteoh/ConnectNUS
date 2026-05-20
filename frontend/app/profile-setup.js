import React, { useContext } from 'react';
import { useRouter } from 'expo-router';
import ProfileForm from '../components/ProfileForm';
import { AuthContext } from './_layout';

export default function ProfileSetupScreen() {
  const router = useRouter();

  const { setProfileComplete } = useContext(AuthContext);

  return (
    <ProfileForm
      title="Set Up Your Profile"
      subtitle="Complete this once so ConnectNUS can personalize your experience."
      submitLabel="Save and Continue"
      allowCancel={false}
      onSaved={() => {
        setProfileComplete(true);
        router.replace('/(tabs)/home');
      }}
    />
  );
}
