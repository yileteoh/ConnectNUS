// frontend/app/register.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, SafeAreaView } from 'react-native';
import { auth } from '../firebaseConfig'; 
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

const BASE_URL = Constants.expoConfig.extra.backendUrl;

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSignUp = () => {
    // 1. NUS Email Verification
    if (!email.endsWith('@u.nus.edu')) {
      Alert.alert("Invalid Email", "Please use your NUS student email.");
      return;
    }

    // 2. Firebase Registration
    createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;

        // 3. Sync with Node.js Backend
        // YOUR IP ADDRESS
        try {
          console.log('Backend URL:', BASE_URL);
          await fetch(`${BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, uid: user.uid }),
          });

          Alert.alert("Success", "Account created and synced to backend!");
          router.replace('/'); // Go back to login screen
        } catch (error) {
          console.log("Backend Sync Error:", error);
          Alert.alert("Partial Success", "Account created, but backend notification failed.");
        }
      })
      .catch((error) => {
        Alert.alert("Registration Error", error.message);
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.welcomeText}>Create Account</Text>
        <Text style={styles.subText}>Join the ConnectNUS community</Text>
        
        <Text style={styles.label}>NUS student email</Text>
        <TextInput
          style={styles.input}
          placeholder="e1234567@u.nus.edu"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Min 6 characters"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.registerButton} onPress={handleSignUp}>
          <Text style={styles.buttonText}>Register Now →</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/')}>
          <Text style={styles.backText}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  welcomeText: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#1A1A1A' },
  subText: { fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 30 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', padding: 15, borderRadius: 10, marginBottom: 20 },
  registerButton: { backgroundColor: '#001F3F', padding: 18, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  backText: { textAlign: 'center', marginTop: 20, color: '#001F3F', textDecorationLine: 'underline' }
});