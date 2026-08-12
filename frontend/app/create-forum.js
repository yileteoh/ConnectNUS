// frontend/app/create-forum.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth } from '../firebaseConfig';
import { createNewForumPost } from '../services/forumService';

// Define the available categories for forum discussions
const FORUM_CATEGORIES = ['Study', 'Campus', 'Romance', 'Job', 'Others'];

export default function CreateForumScreen() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Study'); // Default selection
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form submission dispatcher
  const handlePublish = async () => {
    const currentUserId = auth.currentUser?.uid;

    if (!currentUserId) {
      Alert.alert('Session Expired', 'Please re-authenticate and log in again.');
      return;
    }

    // Comprehensive front-end validation guard
    if (!title.trim() || !content.trim()) {
      Alert.alert('Missing Fields', 'Please provide a title and your discussion content.');
      return;
    }

    // Set submitting state to true to show loading indicator
    setSubmitting(true);
    try {
      const transmissionPayload = {
        title: title.trim(),
        category,
        content: content.trim(),
        creatorId: currentUserId
      };

      // Ship the structured blueprint to the server API
      await createNewForumPost(transmissionPayload);

      Alert.alert('Success!', 'Your discussion has been posted to the forum.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Failed to submit forum payload:', error);
      Alert.alert('Submission Failed', error.message || 'Please check your connection parameters.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* Custom Screen Top Navigation bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} disabled={submitting}>
            <Ionicons name="close" size={26} color="#002D5B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Discussion</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Title</Text>
            <TextInput
              style={styles.textInput}
              placeholder="CS3231 difficulty level?"
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.formLabel}>Topic Category</Text>
            <View style={styles.chipGrid}>
              {FORUM_CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Discussion Content</Text>
            <TextInput
              style={[styles.textInput, styles.textAreaInput]}
              placeholder="Share your thoughts, ask questions, or provide resources..."
              placeholderTextColor="#999"
              value={content}
              onChangeText={setContent}
              multiline={true}
              numberOfLines={8}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity style={styles.publishButton} onPress={handlePublish} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.publishButtonText}>Post to Forum →</Text>
            )}
          </TouchableOpacity>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Define the styling schema for the CreateForumScreen component
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  keyboardView: { flex: 1 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#F0F0F0' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#002D5B' },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  formSection: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EAEAEA', padding: 16, marginBottom: 20 },
  formLabel: { fontSize: 13, fontWeight: '700', color: '#002D5B', marginBottom: 8, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  textInput: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#333333', marginBottom: 16 },
  textAreaInput: { minHeight: 160, paddingTop: 12, marginBottom: 4 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  categoryChip: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 10, backgroundColor: '#FFFFFF' },
  categoryChipSelected: { borderColor: '#F28C28', backgroundColor: '#FFF5EB' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#555555' },
  chipTextSelected: { color: '#F28C28', fontWeight: '700' },
  publishButton: { backgroundColor: '#F28C28', borderRadius: 8, paddingVertical: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  publishButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' }
});