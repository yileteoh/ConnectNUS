import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../firebaseConfig';
import {
  emptyProfile,
  normalizeProfile,
  updateUserProfile,
} from '../services/profileService';
import { uploadImage } from '../services/chatService';
import {
  FACULTY_OPTIONS,
  INTEREST_OPTIONS,
  YEAR_OPTIONS,
} from '../constants/profileOptions';

const toggleListValue = (currentList, value) => {
  if (currentList.includes(value)) {
    return currentList.filter((item) => item !== value);
  }

  return [...currentList, value];
};

export default function ProfileForm({
  initialProfile,
  title,
  subtitle,
  submitLabel,
  onSaved,
  onCancel,
  allowCancel = true,
  hasBuddy = false,
}) {
  const [form, setForm] = useState(emptyProfile);
  const [moduleQuery, setModuleQuery] = useState('');
  const [customInterest, setCustomInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [allModules, setAllModules] = useState([]);
  const [isFetchingModules, setIsFetchingModules] = useState(true);

  useEffect(() => {

    const normalized = normalizeProfile(initialProfile || {});
    
    if (Array.isArray(normalized.socialLinks)) {
      normalized.socialLinks = normalized.socialLinks.join(', ');
    } else if (typeof normalized.socialLinks !== 'string') {
      normalized.socialLinks = '';
    }

    setForm(normalized);
  }, [initialProfile]);

  useEffect(() => {
    let isActive = true;
    const fetchNUSModules = async () => {
      try {
        const ACAD_YEAR = '2025-2026';
        const response = await fetch(`https://api.nusmods.com/v2/${ACAD_YEAR}/moduleList.json`);
        const data = await response.json();
        if (isActive) {
          setAllModules(data);
        }
      } catch (error) {
        console.error('Failed to fetch NUSMods:', error);
      } finally {
        if (isActive) setIsFetchingModules(false);
      }
    };

    fetchNUSModules();
    return () => { isActive = false; };
  }, []);

  const moduleOptions = useMemo(() => {

    if (!Array.isArray(allModules) || allModules.length === 0) {
      return [];
    }
    
    const query = moduleQuery.trim().toUpperCase();

    if (!query) {
      return allModules.slice(0, 20);
    }

    return allModules
      .filter((mod) => {
        const safeCode = mod?.moduleCode || '';
        return safeCode.toUpperCase().startsWith(query)
      })
      .slice(0, 20);
  }, [moduleQuery, allModules]);

  const getPreviewSource = () => {
    if (form.profilePicUrl && form.profilePicUrl.trim() !== '') {
      return { uri: form.profilePicUrl.trim() };
    }
    return require('../assets/profile_image.jpg');
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleModule = (moduleCode) => {
    updateField('modules', toggleListValue(form.modules, moduleCode));
  };

  const toggleInterest = (interest) => {
    updateField('interests', toggleListValue(form.interests, interest));
  };

  const addCustomInterest = () => {
    const nextInterest = customInterest.trim();
    if (!nextInterest) return;

    if (!form.interests.includes(nextInterest)) {
      updateField('interests', [...form.interests, nextInterest]);
    }

    setCustomInterest('');
  };

  const handlePickProfilePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required to upload a profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled) return;
      setUploadingPhoto(true);
      const url = await uploadImage(result.assets[0].uri);
      updateField('profilePicUrl', url);
    } catch (error) {
      console.error('Profile photo upload error:', error?.code, error?.message, error);
      Alert.alert('Upload failed', 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    const userId = auth.currentUser?.uid;

    if (!userId) {
      Alert.alert('Session expired', 'Please log in again.');
      return;
    }

    if (
      !form.name.trim() ||
      !form.faculty.trim() ||
      !form.year.trim() ||
      form.modules.length === 0 ||
      form.interests.length === 0
    ) {
      Alert.alert(
        'Missing basic profile',
        'Please complete name, faculty, year, at least one module, and at least one interest.'
      );
      return;
    }

    setSaving(true);
    try {
      const submissionData = { ...form };

      submissionData.profilePicUrl = form.profilePicUrl ? form.profilePicUrl.trim() : '';

      if (typeof submissionData.socialLinks === 'string') {
        submissionData.socialLinks = submissionData.socialLinks
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }

      await updateUserProfile(userId, submissionData);
      const rememberedForm = { ...submissionData };
      if (Array.isArray(rememberedForm.socialLinks)) {
        rememberedForm.socialLinks = rememberedForm.socialLinks.join(', ');
      }
      setForm(rememberedForm);
      
      onSaved?.();
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Save failed', error.message || 'Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            {allowCancel ? (
              <TouchableOpacity style={styles.iconButton} onPress={onCancel} disabled={saving}>
                <Ionicons name="chevron-back" size={24} color="#002D5B" />
              </TouchableOpacity>
            ) : null}
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Profile</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              value={form.name}
              onChangeText={(value) => updateField('name', value)}
            />

            <Text style={styles.label}>Faculty</Text>
            <View style={styles.optionGrid}>
              {FACULTY_OPTIONS.map((faculty) => (
                <TouchableOpacity
                  key={faculty}
                  style={[styles.optionChip, form.faculty === faculty && styles.optionChipSelected]}
                  onPress={() => updateField('faculty', faculty)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      form.faculty === faculty && styles.optionChipTextSelected,
                    ]}
                  >
                    {faculty}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Year</Text>
            <View style={styles.optionGrid}>
              {YEAR_OPTIONS.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[styles.optionChip, form.year === year && styles.optionChipSelected]}
                  onPress={() => updateField('year', year)}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      form.year === year && styles.optionChipTextSelected,
                    ]}
                  >
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.labelRow}>
              <Text style={styles.label}>Modules</Text>
              <Text style={styles.helperText}>{form.modules.length} selected</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Search module code, e.g. CS2030"
              value={moduleQuery}
              onChangeText={setModuleQuery}
              autoCapitalize="characters"
            />

            {form.modules.length ? (
              <View style={styles.selectedList}>
                {form.modules.map((moduleCode) => (
                  <TouchableOpacity
                    key={moduleCode}
                    style={styles.selectedChip}
                    onPress={() => toggleModule(moduleCode)}
                  >
                    <Text style={styles.selectedChipText}>{moduleCode}</Text>
                    <Ionicons name="close" size={14} color="#002D5B" />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <View style={styles.optionGrid}>
              {moduleOptions.map((mod) => {
                const code = mod.moduleCode; 
                const selected = form.modules.includes(code);
                
                return (
                  <TouchableOpacity
                    key={code}
                    style={[styles.moduleChip, selected && styles.moduleChipSelected]}
                    onPress={() => toggleModule(code)}
                  >
                    <Text
                      style={[
                        styles.moduleChipText,
                        selected && styles.moduleChipTextSelected,
                      ]}
                    >
                      {code}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {!isFetchingModules && moduleQuery.trim() !== '' && moduleOptions.length === 0 && (
              <Text style={styles.helperText}>No modules found matching {moduleQuery}.</Text>
            )}

            <Text style={styles.helperText}>
              Showing up to 20 results. Search to narrow the list.
            </Text>

            <View style={styles.labelRow}>
              <Text style={styles.label}>Interests</Text>
              <Text style={styles.helperText}>{form.interests.length} selected</Text>
            </View>
            <View style={styles.optionGrid}>
              {INTEREST_OPTIONS.map((interest) => {
                const selected = form.interests.includes(interest);
                return (
                  <TouchableOpacity
                    key={interest}
                    style={[styles.optionChip, selected && styles.optionChipSelected]}
                    onPress={() => toggleInterest(interest)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        selected && styles.optionChipTextSelected,
                      ]}
                    >
                      {interest}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Other Interest</Text>
            <View style={styles.inlineInputRow}>
              <TextInput
                style={[styles.input, styles.inlineInput]}
                placeholder="Add your own interest"
                value={customInterest}
                onChangeText={setCustomInterest}
              />
              <TouchableOpacity style={styles.addButton} onPress={addCustomInterest}>
                <Ionicons name="add" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            {form.interests.length ? (
              <View style={styles.selectedList}>
                {form.interests.map((interest) => (
                  <TouchableOpacity
                    key={interest}
                    style={styles.selectedChip}
                    onPress={() => toggleInterest(interest)}
                  >
                    <Text style={styles.selectedChipText}>{interest}</Text>
                    <Ionicons name="close" size={14} color="#002D5B" />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Extended Profile</Text>

            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Share a short introduction"
              value={form.bio}
              onChangeText={(value) => updateField('bio', value)}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.label}>Profile Picture</Text>
            <View style={styles.avatarPickerRow}>
              <TouchableOpacity
                onPress={handlePickProfilePhoto}
                disabled={uploadingPhoto || saving}
                style={styles.avatarPickerButton}
              >
                <Image source={getPreviewSource()} style={styles.avatarPickerImage} />
                <View style={styles.avatarEditBadge}>
                  {uploadingPhoto
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Ionicons name="camera" size={16} color="#FFF" />
                  }
                </View>
              </TouchableOpacity>
              <Text style={[styles.helperText, { flex: 1, flexWrap: 'wrap' }]}>
                Tap the photo to upload from your library.{'\n'}Default avatar is used if none is set.
              </Text>
            </View>

            <Text style={styles.label}>Social Links</Text>
            <Text style={[styles.helperText, { color: '#002D5B', fontWeight: '500' }]}>
               Tip: You can separate multiple platforms with commas. We automatically recognize LinkedIn, GitHub, Instagram, and Telegram!
            </Text>
            <TextInput
              style={[styles.input, styles.socialTextArea]}
              placeholder="https://instagram.com/username, https://github.com/username"
              value={form.socialLinks}
              onChangeText={(value) => updateField('socialLinks', value)}
              autoCapitalize="none"
              multiline={true}
              textAlignVertical="top"
            />

            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <Text style={styles.switchTitle}>Open to buddy matching</Text>
                <Text style={styles.switchSubtitle}>
                  Show that you are available to help or study together.
                </Text>
              </View>
              <Switch
                value={form.buddyStatus}
                onValueChange={(value) => updateField('buddyStatus', value)}
                trackColor={{ false: '#D1D5DB', true: '#A8C5E6' }}
                thumbColor={form.buddyStatus ? '#002D5B' : '#F4F4F5'}
                disabled={hasBuddy}
              />
            </View>

            {hasBuddy && (
              <Text style={{ color: '#D32F2F', fontSize: 12, marginTop: 8 }}>
                You are currently paired. Dissolve your partnership first to change this setting.
              </Text>
            )}
            
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>{submitLabel}</Text>
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
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#002D5B',
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#002D5B',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  label: {
    color: '#1A1A1A',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  helperText: {
    color: '#777',
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 110,
  },
  socialTextArea: {
    minHeight: 80,
    paddingTop: 12, 
    marginBottom: 14,
  },
  avatarPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarPickerButton: {
    position: 'relative',
    marginRight: 16,
  },
  avatarPickerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E7EB',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#002D5B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#FFF',
  },
  optionChipSelected: {
    borderColor: '#002D5B',
    backgroundColor: '#E0E8F5',
  },
  optionChipText: {
    color: '#333',
    fontSize: 13,
    fontWeight: '600',
  },
  optionChipTextSelected: {
    color: '#002D5B',
  },
  moduleChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#FFF',
  },
  moduleChipSelected: {
    borderColor: '#002D5B',
    backgroundColor: '#E0E8F5',
  },
  moduleChipText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '700',
  },
  moduleChipTextSelected: {
    color: '#002D5B',
  },
  selectedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E8F5',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedChipText: {
    color: '#002D5B',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 5,
  },
  inlineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  inlineInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 8,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#002D5B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchText: {
    flex: 1,
    paddingRight: 14,
  },
  switchTitle: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  switchSubtitle: {
    color: '#666',
    fontSize: 12,
    lineHeight: 17,
  },
  saveButton: {
    backgroundColor: '#002D5B',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
