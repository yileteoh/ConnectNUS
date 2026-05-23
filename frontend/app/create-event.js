// frontend/app/create-event.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth } from '../firebaseConfig';
import { createNewEvent } from '../services/eventService';
import { EVENT_CATEGORIES } from '../constants/eventOptions';

export default function CreateEventScreen() {
  const router = useRouter();

  // Initialize the state parameters reflecting the exact backend server schemas
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Study Group'); // Default selection
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [capacity, setCapacity] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date'); 
  const [displayTime, setDisplayTime] = useState(''); 
  const [isoTime, setIsoTime] = useState(''); 

  // Handler to toggle between date and time pickers
  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (!selectedDate) return;

    setDate(selectedDate);

    const formattedDate = selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const formattedTime = selectedDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    
    setDisplayTime(`${formattedDate}, ${formattedTime}`);
    setIsoTime(selectedDate.toISOString());
  };

  // Form submission dispatcher
  const handlePublish = async () => {
    const currentUserId = auth.currentUser?.uid;

    if (!currentUserId) {
      Alert.alert('Session Expired', 'Please re-authenticate and log in again.');
      return;
    }

    const capNumber = parseInt(capacity, 10);

    // Comprehensive front-end validation guard
    if (!title.trim() || !location.trim() || !isoTime) {
      Alert.alert('Missing Fields', 'Please complete the event title, location setup, and meeting time.');
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
      const transmissionPayload = {
        title: title.trim(),
        category,
        location: location.trim(),
        time: isoTime,
        capacity: capNumber,
        description: description.trim(),
        creatorId: currentUserId
      };

      // Ship the structured blueprint to the server API
      await createNewEvent(transmissionPayload);

      Alert.alert('Success!', 'Your campus activity has been published successfully.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/event') }
      ]);
    } catch (error) {
      console.error('Failed to submit event payload:', error);
      Alert.alert('Submission Failed', error.message || 'Please check your connection parameters.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Custom Screen Top Navigation bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} disabled={submitting}>
            <Ionicons name="close" size={26} color="#002D5B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Host an Event</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          
          {/* Section: Core Information */}
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
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {cat}
                    </Text>
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

            <Text style={styles.formLabel}>Date & Time</Text>
            <View style={styles.dateTimeContainer}>
              {/* Left Column: Date */}
              <View style={styles.datePickerColumn}>
                <Text style={styles.miniLabel}>Date</Text>
                <TouchableOpacity 
                  style={styles.dateTimeButton} 
                  onPress={() => { setPickerMode('date'); setShowPicker(true); }}
                >
                  <Ionicons name="calendar-outline" size={20} color="#002D5B" />
                  <Text style={styles.dateTimeButtonText}>
                    {displayTime ? displayTime.split(',')[0] : 'Select Date'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ width: 16 }} />

              {/* Right Column: Time */}
              <View style={styles.datePickerColumn}>
                <Text style={styles.miniLabel}>Time</Text>
                <TouchableOpacity 
                  style={styles.dateTimeButton} 
                  onPress={() => { setPickerMode('time'); setShowPicker(true); }}
                >
                  <Ionicons name="time-outline" size={20} color="#002D5B" />
                  <Text style={styles.dateTimeButtonText}>
                    {displayTime ? displayTime.split(',')[1]?.trim() : 'Select Time'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {showPicker && (
              <DateTimePicker
                value={date}
                mode={pickerMode}
                is24Hour={true}
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
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

          {/* Section: Extended Details */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Description (Optional)</Text>
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

          {/* Action Trigger Button */}
          <TouchableOpacity 
            style={styles.publishButton} 
            onPress={handlePublish} 
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.publishButtonText}>Start Invitation →</Text>
            )}
          </TouchableOpacity>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  keyboardView: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#002D5B',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    padding: 16,
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#002D5B',
    marginBottom: 8,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333333',
    marginBottom: 16,
  },
  textAreaInput: {
    minHeight: 100,
    paddingTop: 12,
    marginBottom: 4,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  categoryChipSelected: {
    borderColor: '#002D5B',
    backgroundColor: '#EBF4FA',
  },
  capacityChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  capacityChipSelected: {
    borderColor: '#F28C28',
    backgroundColor: '#FFF5EB',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
  },
  chipTextSelected: {
    color: '#002D5B',
    fontWeight: '700',
  },
  publishButton: {
    backgroundColor: '#002D5B',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  dateTimeContainer: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 16,
  },
  datePickerColumn: {
    flex: 1, 
  },
  miniLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  dateTimeButton: {
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8F9FA', 
    borderWidth: 1, 
    borderColor: '#D1D5DB',
    borderRadius: 8, 
    paddingVertical: 14, 
    paddingHorizontal: 12,
  },
  dateTimeButtonText: {
    marginLeft: 8, 
    fontSize: 14, 
    color: '#333', 
    fontWeight: '600'
  }
});