// frontend/app/edit-forum/[id].js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { auth } from '../../firebaseConfig';
import { getForumDetails, updateForumPost } from '../../services/forumService';

const FORUM_CATEGORIES = ['Study', 'Campus', 'Romance', 'Job', 'Others'];

export default function EditForumScreen() {
  const { id } = useLocalSearchParams(); 
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Study');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchOriginal = async () => {
      try {
        const data = await getForumDetails(id);
        if (data.creatorId !== auth.currentUser?.uid) {
          Alert.alert('Unauthorized', 'Cannot edit this post.');
          router.back();
          return;
        }
        setTitle(data.title);
        setCategory(data.category);
        setContent(data.content);
      } catch (error) {
        Alert.alert('Error', 'Failed to load post.');
        router.back();
      } finally { setLoading(false); }
    };
    fetchOriginal();
  }, [id, router]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return Alert.alert('Missing Fields', 'Please complete title and content.');
    setSubmitting(true);
    try {
      await updateForumPost(id, auth.currentUser?.uid, { title: title.trim(), category, content: content.trim() });
      Alert.alert('Success', 'Post updated.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally { setSubmitting(false); }
  };

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#002D5B" /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} disabled={submitting}>
            <Ionicons name="close" size={26} color="#002D5B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Discussion</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={{ padding: 20 }}>
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
              {FORUM_CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat} style={[styles.categoryChip, category === cat && styles.categoryChipSelected]} onPress={() => setCategory(cat)}>
                  <Text style={[styles.chipText, category === cat && styles.chipTextSelected]}>{cat}</Text>
                </TouchableOpacity>
              ))}
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

          <TouchableOpacity style={styles.publishButton} onPress={handleSave} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.publishButtonText}>Save Changes</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#F0F0F0' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#002D5B' },
  scrollContainer: { flex: 1 },
  formSection: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EAEAEA', padding: 16, marginBottom: 20 },
  formLabel: { fontSize: 13, fontWeight: '700', color: '#002D5B', marginBottom: 8, marginTop: 6, textTransform: 'uppercase' },
  textInput: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#333333', marginBottom: 16 },
  textAreaInput: { minHeight: 160, paddingTop: 12 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  categoryChip: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 10, backgroundColor: '#FFFFFF' },
  categoryChipSelected: { borderColor: '#F28C28', backgroundColor: '#FFF5EB' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#555555' },
  chipTextSelected: { color: '#F28C28', fontWeight: '700' },
  publishButton: { backgroundColor: '#F28C28', borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  publishButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' }
});