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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebaseConfig';
import {
  DEFAULT_PROFILE_PIC_URL,
  emptyProfile,
  isValidHttpUrl,
  normalizeProfile,
  updateUserProfile,
} from '../services/profileService';
import {
  ALL_MODULE_OPTIONS,
  FACULTY_OPTIONS,
  INTEREST_OPTIONS,
  MODULE_OPTIONS_BY_FACULTY,
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
}) {
  const [form, setForm] = useState(emptyProfile);
  const [moduleQuery, setModuleQuery] = useState('');
  const [customInterest, setCustomInterest] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(normalizeProfile(initialProfile || {}));
  }, [initialProfile]);

  const moduleOptions = useMemo(() => {
    const facultyModules = MODULE_OPTIONS_BY_FACULTY[form.faculty] || ALL_MODULE_OPTIONS;
    const query = moduleQuery.trim().toUpperCase();

    if (!query) return facultyModules.slice(0, 36);

    return facultyModules
      .filter((moduleCode) => moduleCode.toUpperCase().includes(query))
      .slice(0, 36);
  }, [form.faculty, moduleQuery]);

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

    if (!isValidHttpUrl(form.profilePicUrl)) {
      Alert.alert('Invalid profile picture link', 'Please enter a valid http:// or https:// image URL.');
      return;
    }

    if (!isValidHttpUrl(form.socialLinks)) {
      Alert.alert('Invalid social link', 'Please enter a valid http:// or https:// social link.');
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile(userId, form);
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
              placeholder="Your display name"
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
              {moduleOptions.map((moduleCode) => {
                const selected = form.modules.includes(moduleCode);
                return (
                  <TouchableOpacity
                    key={moduleCode}
                    style={[styles.moduleChip, selected && styles.moduleChipSelected]}
                    onPress={() => toggleModule(moduleCode)}
                  >
                    <Text
                      style={[
                        styles.moduleChipText,
                        selected && styles.moduleChipTextSelected,
                      ]}
                    >
                      {moduleCode}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.helperText}>
              Showing up to 36 results. Search to narrow the list.
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

            <Text style={styles.label}>Profile Picture URL</Text>
            <View style={styles.avatarPreviewRow}>
              <Image
                source={{ uri: form.profilePicUrl.trim() || DEFAULT_PROFILE_PIC_URL }}
                style={styles.avatarPreview}
              />
              <View style={styles.avatarPreviewText}>
                <Text style={styles.previewTitle}>Profile picture preview</Text>
                <Text style={styles.helperText}>
                  If no picture link is provided, the default avatar will be used.
                </Text>
              </View>
            </View>
            <TextInput
              style={styles.input}
              placeholder="https://..."
              value={form.profilePicUrl}
              onChangeText={(value) => updateField('profilePicUrl', value)}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Social Link</Text>
            <TextInput
              style={styles.input}
              placeholder="https://linkedin.com/in/your-profile"
              value={form.socialLinks}
              onChangeText={(value) => updateField('socialLinks', value)}
              autoCapitalize="none"
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
              />
            </View>
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
  avatarPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  avatarPreview: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginRight: 12,
    backgroundColor: '#E5E7EB',
  },
  avatarPreviewText: {
    flex: 1,
  },
  previewTitle: {
    color: '#1A1A1A',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
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
