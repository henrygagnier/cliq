import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { Ionicons, Feather } from '@expo/vector-icons';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  businessProfile: any;
  categories: string[];
  onUpdate: () => void;
}

export default function EditProfileModal({
  visible,
  onClose,
  businessProfile,
  categories: initialCategories,
  onUpdate,
}: EditProfileModalProps) {
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [saving, setSaving] = useState(false);

  const availableCategories = [
    'Bar',
    'Grill',
    'Restaurant',
    'Café',
    'Event Venue',
    'Shopping',
    'Nightlife',
    'Live Music',
    'Sports Bar',
    'Fine Dining',
    'Fast Casual',
  ];

  useEffect(() => {
    if (businessProfile) {
      setBusinessName(businessProfile.business_name || '');
      setDescription(businessProfile.description || '');
      setAddress(businessProfile.address || '');
      setPhone(businessProfile.phone || '');
      setWebsite(businessProfile.website || '');
      setSelectedCategories(initialCategories || []);
    }
  }, [businessProfile, initialCategories]);

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const addCustomCategory = () => {
    if (customCategoryInput.trim() && !selectedCategories.includes(customCategoryInput.trim())) {
      setSelectedCategories([...selectedCategories, customCategoryInput.trim()]);
      setCustomCategoryInput('');
      setShowCustomInput(false);
    }
  };

  const removeCategory = (category: string) => {
    setSelectedCategories(selectedCategories.filter((c) => c !== category));
  };

  const handleSave = async () => {
    if (!businessName.trim()) {
      Alert.alert('Error', 'Business name is required');
      return;
    }

    if (selectedCategories.length === 0) {
      Alert.alert('Error', 'Please select at least one category');
      return;
    }

    try {
      setSaving(true);

      // Update business profile
      const { error: profileError } = await supabase
        .from('business_profiles')
        .update({
          business_name: businessName,
          description: description,
          address: address,
          phone: phone,
          website: website,
        })
        .eq('id', businessProfile.id);

      if (profileError) throw profileError;

      // Delete old categories
      await supabase
        .from('business_categories')
        .delete()
        .eq('business_id', businessProfile.id);

      // Insert new categories
      const categoryInserts = selectedCategories.map((category) => ({
        business_id: businessProfile.id,
        category: category,
      }));

      const { error: categoriesError } = await supabase
        .from('business_categories')
        .insert(categoryInserts);

      if (categoriesError) throw categoriesError;

      Alert.alert('Success', 'Profile updated successfully!');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Edit Profile</Text>
              <Text style={styles.headerSubtitle}>
                Update your business information
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#a3a3a3" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView style={styles.scrollContent}>
            <View style={styles.formContainer}>
              {/* Business Name */}
              <View>
                <Text style={styles.inputLabel}>Business Name</Text>
                <TextInput
                  value={businessName}
                  onChangeText={setBusinessName}
                  style={styles.textInput}
                  placeholder="Enter business name"
                  placeholderTextColor="#737373"
                />
              </View>

              {/* Description */}
              <View>
                <Text style={styles.inputLabel}>
                  <Feather name="align-left" size={14} color="#a3a3a3" /> Description
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  style={[styles.textInput, styles.textInputMultiline]}
                  placeholder="Describe your business"
                  placeholderTextColor="#737373"
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Categories */}
              <View>
                <Text style={styles.inputLabel}>
                  Categories (Select all that apply)
                </Text>

                {/* Selected Categories Display */}
                {selectedCategories.length > 0 && (
                  <View style={styles.selectedCategoriesContainer}>
                    {selectedCategories.map((category) => (
                      <View
                        key={category}
                        style={styles.selectedCategoryChip}
                      >
                        <Text style={styles.selectedCategoryText}>{category}</Text>
                        <TouchableOpacity onPress={() => removeCategory(category)}>
                          <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.8)" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Available Categories */}
                <View style={styles.categoriesGrid}>
                  {availableCategories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      onPress={() => toggleCategory(category)}
                      style={[
                        styles.categoryChip,
                        selectedCategories.includes(category) ? styles.categoryChipSelected : styles.categoryChipUnselected
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          selectedCategories.includes(category) ? styles.categoryChipTextSelected : styles.categoryChipTextUnselected
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  {/* Custom Category Button */}
                  <TouchableOpacity
                    onPress={() => setShowCustomInput(!showCustomInput)}
                    style={[
                      styles.categoryChip,
                      styles.customCategoryButton,
                      showCustomInput ? styles.categoryChipSelected : styles.categoryChipUnselected
                    ]}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={14}
                      color={showCustomInput ? 'white' : '#d4d4d4'}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        showCustomInput ? styles.categoryChipTextSelected : styles.categoryChipTextUnselected
                      ]}
                    >
                      Custom
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Custom Input */}
                {showCustomInput && (
                  <View style={styles.customInputContainer}>
                    <TextInput
                      value={customCategoryInput}
                      onChangeText={setCustomCategoryInput}
                      onSubmitEditing={addCustomCategory}
                      style={[styles.textInput, styles.marginBottom8]}
                      placeholder="Enter custom category name"
                      placeholderTextColor="#737373"
                      returnKeyType="done"
                    />
                    <View style={styles.customInputButtons}>
                      <TouchableOpacity
                        onPress={addCustomCategory}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={['#06b6d4', '#3b82f6']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.addCategoryButton}
                        >
                          <Ionicons name="add-circle" size={16} color="white" style={{ marginRight: 4 }} />
                          <Text style={styles.addCategoryButtonText}>Add Category</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setShowCustomInput(false);
                          setCustomCategoryInput('');
                        }}
                        style={styles.cancelButton}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Address */}
              <View>
                <Text style={styles.inputLabel}>
                  <Ionicons name="location-outline" size={14} color="#a3a3a3" /> Address
                </Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  style={styles.textInput}
                  placeholder="Enter business address"
                  placeholderTextColor="#737373"
                />
              </View>

              {/* Phone */}
              <View>
                <Text style={styles.inputLabel}>
                  <Ionicons name="call-outline" size={14} color="#a3a3a3" /> Phone Number
                </Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  style={styles.textInput}
                  placeholder="Enter phone number"
                  placeholderTextColor="#737373"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Website */}
              <View>
                <Text style={styles.inputLabel}>
                  <Ionicons name="globe-outline" size={14} color="#a3a3a3" /> Website
                </Text>
                <TextInput
                  value={website}
                  onChangeText={setWebsite}
                  style={styles.textInput}
                  placeholder="Enter website URL"
                  placeholderTextColor="#737373"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#06b6d4', '#3b82f6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButton}
              >
                {saving ? (
                  <Text style={styles.saveButtonText}>Saving...</Text>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContainer: {
    flex: 1,
    marginTop: 80,
    backgroundColor: '#171717',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(38,38,38,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(38,38,38,0.5)',
  },
  headerTitle: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 6,
    fontWeight: '500',
  },
  closeButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(38,38,38,0.5)',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  formContainer: {
    gap: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: '#a3a3a3',
    fontWeight: '600',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: 'rgba(38,38,38,0.5)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(64,64,64,0.5)',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  textInputMultiline: {
    height: 120,
    textAlignVertical: 'top',
  },
  selectedCategoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
    padding: 16,
    backgroundColor: 'rgba(38,38,38,0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(64,64,64,0.3)',
  },
  selectedCategoryChip: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCategoryText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  categoryChipSelected: {
    backgroundColor: '#06b6d4',
    borderColor: 'rgba(34, 211, 238, 0.5)',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryChipUnselected: {
    backgroundColor: 'rgba(38,38,38,0.5)',
    borderColor: 'rgba(64,64,64,0.3)',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  categoryChipTextUnselected: {
    color: '#d4d4d4',
  },
  customCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customInputContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(38,38,38,0.3)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(64,64,64,0.3)',
  },
  customInputButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  addCategoryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addCategoryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -0.3,
  },
  cancelButton: {
    paddingHorizontal: 20,
    backgroundColor: 'rgba(64,64,64,0.4)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(64,64,64,0.3)',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#d4d4d4',
    fontWeight: '600',
    fontSize: 15,
  },
  marginBottom8: {
    marginBottom: 10,
  },
  footer: {
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(38,38,38,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: -0.3,
  },
});
