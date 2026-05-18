import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, SafeAreaView, Image } from 'react-native';
import { auth } from '../firebaseConfig'; 
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter(); // Initialize router for navigation

  const handleLogin = () => {
    // 1. Basic validation
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    // 2. Login Logic
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        console.log("Logged in:", userCredential.user.email);
        // 3. Navigate to the Home page after successful login
        router.replace('/home'); 
      })
      .catch((error) => {
        // This will trigger if the user doesn't exist or password is wrong
        Alert.alert("Login Failed", error.message);
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconPlaceholder}>
          <Image 
            source={require('../assets/icon.png')} // Path to icon
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        
        <Text style={styles.welcomeText}>Welcome back!</Text>
        <Text style={styles.subText}>Sign in to your ConnectNUS</Text>
        
        <View style={styles.inputContainer}>
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
            placeholder="******"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login →</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/register')}>
          <Text style={styles.noAccountText}>Oops, I don't have an account</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          © 2026 ConnectNUS. Built for the NUS Community
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  iconPlaceholder: { alignSelf: 'center', backgroundColor: '#e6e6e6', paddingTop: 0, paddingBottom: 10, paddingLeft: 5, paddingRight: 5, borderRadius: 20, marginBottom: 20 },
  logoImage: { width: 110, height: 110 },
  welcomeText: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#1A1A1A' },
  subText: { fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 30 },
  inputContainer: { marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', padding: 15, borderRadius: 10, marginBottom: 20 },
  loginButton: { backgroundColor: '#001F3F', padding: 18, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  noAccountText: { textAlign: 'center', marginTop: 20, color: '#001F3F', fontWeight: '600', textDecorationLine: 'underline' },
  footer: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 12, color: '#999' }
});