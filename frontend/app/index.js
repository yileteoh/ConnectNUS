import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, SafeAreaView } from 'react-native';
// Ensure firebaseConfig.js is in the 'frontend' folder (one level up from this file)
import { auth } from '../firebaseConfig'; 
import { createUserWithEmailAndPassword } from 'firebase/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = () => {
    // 1. NUS Email Verification [cite: 54, 192]
    if (!email.endsWith('@u.nus.edu') && !email.endsWith('@nus.edu.sg')) {
      Alert.alert("Invalid Email", "Please use your NUS student email.");
      return;
    }

    // 2. Firebase Registration Logic [cite: 122, 123]
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        Alert.alert("Success", "PoC: Account created for " + userCredential.user.email);
      })
      .catch((error) => {
        Alert.alert("Registration Error", error.message);
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconPlaceholder}>
           <Text style={{fontSize: 40}}>🎓</Text>
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
            placeholder="********"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleSignUp}>
          <Text style={styles.buttonText}>Login →</Text>
        </TouchableOpacity>

        <TouchableOpacity>
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
  iconPlaceholder: { alignSelf: 'center', backgroundColor: '#001F3F', padding: 20, borderRadius: 20, marginBottom: 20 },
  welcomeText: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#1A1A1A' },
  subText: { fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 30 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', padding: 15, borderRadius: 10, marginBottom: 20 },
  loginButton: { backgroundColor: '#001F3F', padding: 18, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  noAccountText: { textAlign: 'center', marginTop: 20, color: '#001F3F', fontWeight: '600', textDecorationLine: 'underline' },
  footer: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 12, color: '#999' }
});