// frontend/app/edit-event/[id].js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker'; 
import { auth } from '../../firebaseConfig';
import { getEventDetails, updateEvent } from '../../services/eventService';
import { EVENT_CATEGORIES } from '../../constants/eventOptions';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams(); // Auto catch dynamic event tracking ID from URL route
  const router = useRouter();

  // Page tracking states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form input controllers
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Study Group');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [description, setDescription] = useState('');

  // DateTime Wheel Controller states
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
  const [displayTime, setDisplayTime] = useState('');
  const [isoTime, setIsoTime] = useState('');

  // Fetch data on mount to pre-fill existing information
  useEffect(() => {
    const loadOriginalDetails = async () => {
      try {
        const data = await getEventDetails(id);
        
        // Only the real creator can access this configuration dashboard
        if (data.creatorId !== auth.currentUser?.uid) {
          Alert.alert('Unauthorized', 'You do not own the editing credentials for this room.');
          router.back();
          return;
        }

        setTitle(data.title);
        setCategory(data.category);
        setLocation(data.location);
        setCapacity(String(data.capacity));
        setDescription(data.description || '');

        if (data.time) {
          const parsedDate = new Date(data.time);
          setDate(parsedDate);
          setIsoTime(data.time);
          const formattedDate = parsedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          const formattedTime = parsedDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          setDisplayTime(`${formattedDate}, ${formattedTime}`);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to retrieve event profiles.');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadOriginalDetails();
  }, [id, router]);

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (!selectedDate) return;

    setDate(selectedDate);
    const formattedDate = selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const formattedTime = selectedDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    
    setDisplayTime(`${formattedDate}, ${formattedTime}`);
    setIsoTime(selectedDate.toISOString());
  };

  const handleSaveChanges = async () => {
    const currentUserId = auth.currentUser?.uid;
    const capNumber = parseInt(capacity, 10);

    if (!title.trim() || !location.trim() || !isoTime) {
      Alert.alert('Missing Fields', 'Please fill up mandatory information before save operations.');
      return;
    }

    const selectedTimeMs = new Date(isoTime).getTime();
    const currentTimeMs = Date.now();
    if (selectedTimeMs <= currentTimeMs) {
      Alert.alert('Invalid Time', 'Events must be scheduled for a future time.');
      return;
    }

    if (isNaN(capNumber) || capNumber <= 1) {
      Alert.alert('Invalid Capacity', 'An event must have at least 2 slots (including yourself).');
      return;
    }

    setSubmitting(true);
    try {
      const adjustmentPayload = {
        title: title.trim(),
        category,
        location: location.trim(),
        time: isoTime,
        capacity: capNumber,
        description: description.trim()
      };

      // Dispatch data package stream to update API endpoint
      await updateEvent(id, currentUserId, adjustmentPayload);

      Alert.alert('Updated Successfully!', 'Your changes have been saved.', [
        { text: 'OK', onPress: () => router.replace(`/event-details/${id}`) }
      ]);
    } catch (error) {
      Alert.alert('Update Terminated', error.message || 'Check structural constraints.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#002D5B" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} disabled={submitting}>
            <Ionicons name="close" size={26} color="#002D5B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Event</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Event Title</Text>
            <TextInput
              style={styles.textInput}
              placeholder="GEA1000 Study Group"
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.formLabel}>Category</Text>
            <View style={styles.chipGrid}>
              {EVENT_CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.formLabel}>Location</Text>
            <TextInput
                style={styles.textInput}
                placeholder="Central Library Level 4"
                placeholderTextColor="#999"
                value={location}
                onChangeText={setLocation}
            />
            <Text style={styles.formLabel}>Date & Time Window</Text>
            
            <View style={styles.dateTimeContainer}>
              <View style={styles.datePickerColumn}>
                <Text style={styles.miniLabel}>Date</Text>
                <TouchableOpacity style={styles.dateTimeButton} onPress={() => { setPickerMode('date'); setShowPicker(true); }}>
                  <Ionicons name="calendar-outline" size={20} color="#002D5B" />
                  <Text style={styles.dateTimeButtonText}>{displayTime ? displayTime.split(',')[0] : 'Select Date'}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ width: 16 }} />
              <View style={styles.datePickerColumn}>
                <Text style={styles.miniLabel}>Time</Text>
                <TouchableOpacity style={styles.dateTimeButton} onPress={() => { setPickerMode('time'); setShowPicker(true); }}>
                  <Ionicons name="time-outline" size={20} color="#002D5B" />
                  <Text style={styles.dateTimeButtonText}>{displayTime ? displayTime.split(',')[1]?.trim() : 'Select Time'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showPicker && (
              <DateTimePicker value={date} mode={pickerMode} is24Hour={true} display="default" onChange={handleDateChange} minimumDate={new Date()} />
            )}

            <Text style={styles.formLabel}>Max Capacity Limit (Total Slots)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="At least 2 (including yourself)"
              placeholderTextColor="#999"
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="numeric"
              maxLength={5}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Event Description (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textAreaInput]}
              placeholder="Provide your event context to help fellow students join!"
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity style={styles.publishButton} onPress={handleSaveChanges} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.publishButtonText}>Save and Apply Changes →</Text>}
          </TouchableOpacity>
        </ScrollView>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  keyboardView: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#F0F0F0' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#002D5B' },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  formSection: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EAEAEA', padding: 16, marginBottom: 20 },
  formLabel: { fontSize: 13, fontWeight: '700', color: '#002D5B', marginBottom: 8, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  textInput: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#333333', marginBottom: 16 },
  textAreaInput: { minHeight: 100, paddingTop: 12, marginBottom: 4 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  categoryChip: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8, backgroundColor: '#FFFFFF' },
  categoryChipSelected: { borderColor: '#002D5B', backgroundColor: '#EBF4FA' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#555555' },
  chipTextSelected: { color: '#002D5B', fontWeight: '700' },
  dateTimeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  datePickerColumn: { flex: 1 },
  miniLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 6 },
  dateTimeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 12 },
  dateTimeButtonText: { marginLeft: 8, fontSize: 14, color: '#333', fontWeight: '600' },
  publishButton: { backgroundColor: '#F28C28', borderRadius: 8, paddingVertical: 16, alignItems: 'center' }, // Kept premium layout orange accent for actions
  publishButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' }
});