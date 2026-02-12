import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Hotspot {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  address?: string;
  distanceMi?: number;
}

interface ClaimBusinessModalProps {
  visible: boolean;
  onClose: () => void;
  onBusinessClaimed: () => void;
  userId: string;
}

export default function ClaimBusinessModal({
  visible,
  onClose,
  onBusinessClaimed,
  userId,
}: ClaimBusinessModalProps) {
  const [step, setStep] = useState<'search' | 'confirm'>('search');
  const [nearbyHotspots, setNearbyHotspots] = useState<Hotspot[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (visible) {
      loadNearbyHotspots();
    }
  }, [visible]);

  const loadNearbyHotspots = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please enable location to find nearby businesses');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { data: hotspots, error } = await supabase
        .from('hotspots')
        .select('*')
        .limit(100);

      if (error) throw error;

      const hotspotsWithDistance = hotspots
        .map((hotspot) => {
          const distance = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            hotspot.latitude,
            hotspot.longitude
          );

          return {
            ...hotspot,
            distanceMi: distance,
          };
        })
        .filter((h) => h.distanceMi <= 12.4) // Within 12.4 miles
        .sort((a, b) => a.distanceMi - b.distanceMi);

      setNearbyHotspots(hotspotsWithDistance);
    } catch (error) {
      console.error('Error loading hotspots:', error);
      Alert.alert('Error', 'Failed to load nearby locations');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959; // Earth's radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDistance = (distanceMi: number) => {
    if (distanceMi < 1) {
      return `${Math.round(distanceMi * 5280)}ft`;
    }
    return `${distanceMi.toFixed(1)}mi`;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      cafe: 'cafe',
      bar: 'beer',
      pub: 'beer',
      restaurant: 'restaurant',
      fitness_centre: 'fitness',
      coworking_space: 'briefcase',
      college: 'school',
      university: 'school',
      library: 'book',
    };
    return icons[type] || 'location';
  };

  const filteredHotspots = nearbyHotspots.filter((h) =>
    h.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectHotspot = (hotspot: Hotspot) => {
    setSelectedHotspot(hotspot);
    setStep('confirm');
  };

  const handleClaimBusiness = async () => {
    if (!selectedHotspot) return;

    setClaiming(true);
    try {
      // Check if this hotspot is already claimed
      const { data: existingClaim } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('hotspot_id', selectedHotspot.id)
        .single();

      if (existingClaim) {
        Alert.alert('Already Claimed', 'This business has already been claimed by another user.');
        setClaiming(false);
        return;
      }

      // Create business profile
      const { data: businessProfile, error: profileError } = await supabase
        .from('business_profiles')
        .insert({
          user_id: userId,
          hotspot_id: selectedHotspot.id,
          business_name: selectedHotspot.name,
          description: description || `Welcome to ${selectedHotspot.name}!`,
          address: selectedHotspot.address,
          phone: phone,
          website: website,
          status: 'active',
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Add business category based on hotspot type
      const categoryMap: Record<string, string> = {
        cafe: 'Cafe',
        bar: 'Bar',
        pub: 'Bar',
        restaurant: 'Restaurant',
        fitness_centre: 'Fitness',
        coworking_space: 'Coworking',
        college: 'Education',
        university: 'Education',
        library: 'Education',
      };

      const category = categoryMap[selectedHotspot.type] || 'Other';

      await supabase.from('business_categories').insert({
        business_id: businessProfile.id,
        category: category,
      });

      Alert.alert(
        'Success! 🎉',
        `You've successfully claimed ${selectedHotspot.name}. Your business dashboard is now active!`
      );

      onBusinessClaimed();
      handleClose();
    } catch (error) {
      console.error('Error claiming business:', error);
      Alert.alert('Error', 'Failed to claim business. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  const handleClose = () => {
    setStep('search');
    setSelectedHotspot(null);
    setSearchQuery('');
    setPhone('');
    setWebsite('');
    setDescription('');
    onClose();
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('search');
      setSelectedHotspot(null);
    } else {
      handleClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {step === 'search' ? 'Claim Your Business' : 'Confirm Details'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#737373" />
            </TouchableOpacity>
          </View>

          {step === 'search' ? (
            // Step 1: Search and Select Hotspot
            <>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#737373" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search nearby businesses..."
                  placeholderTextColor="#737373"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#06b6d4" />
                  <Text style={styles.loadingText}>Finding nearby businesses...</Text>
                </View>
              ) : (
                <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
                  {filteredHotspots.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="location-outline" size={48} color="#737373" />
                      <Text style={styles.emptyText}>No businesses found nearby</Text>
                      <Text style={styles.emptySubtext}>
                        Try searching or check back later
                      </Text>
                    </View>
                  ) : (
                    filteredHotspots.map((hotspot) => (
                      <TouchableOpacity
                        key={hotspot.id}
                        style={styles.hotspotCard}
                        onPress={() => handleSelectHotspot(hotspot)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.hotspotIcon}>
                          <Ionicons
                            name={getTypeIcon(hotspot.type) as any}
                            size={24}
                            color="#06b6d4"
                          />
                        </View>
                        <View style={styles.hotspotInfo}>
                          <Text style={styles.hotspotName}>{hotspot.name}</Text>
                          <View style={styles.hotspotMeta}>
                            {hotspot.address && (
                              <Text style={styles.hotspotAddress} numberOfLines={1}>
                                {hotspot.address}
                              </Text>
                            )}
                            <View style={styles.distanceBadge}>
                              <Ionicons name="navigate" size={12} color="#737373" />
                              <Text style={styles.distanceText}>
                                {formatDistance(hotspot.distanceMi || 0)}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#737373" />
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              )}
            </>
          ) : (
            // Step 2: Confirm and Add Details
            <ScrollView style={styles.confirmContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.selectedHotspotCard}>
                <View style={styles.selectedHotspotHeader}>
                  <View style={styles.selectedIcon}>
                    <Ionicons
                      name={getTypeIcon(selectedHotspot?.type || '') as any}
                      size={28}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.selectedInfo}>
                    <Text style={styles.selectedName}>{selectedHotspot?.name}</Text>
                    {selectedHotspot?.address && (
                      <Text style={styles.selectedAddress}>{selectedHotspot.address}</Text>
                    )}
                  </View>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Additional Information</Text>
              <Text style={styles.sectionSubtitle}>
                Help customers connect with your business
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={18} color="#737373" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="(555) 123-4567"
                    placeholderTextColor="#525252"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Website</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="globe-outline" size={18} color="#737373" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="www.yourbusiness.com"
                    placeholderTextColor="#525252"
                    value={website}
                    onChangeText={setWebsite}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Tell customers about your business..."
                  placeholderTextColor="#525252"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={styles.claimButton}
                onPress={handleClaimBusiness}
                disabled={claiming}
                activeOpacity={0.8}
              >
                {claiming ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.claimButtonText}>Claim This Business</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                By claiming this business, you confirm that you are an authorized representative.
              </Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171717',
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#737373',
    marginTop: 16,
    fontSize: 14,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#737373',
    fontSize: 14,
    marginTop: 8,
  },
  hotspotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171717',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  hotspotIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  hotspotInfo: {
    flex: 1,
  },
  hotspotName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  hotspotMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hotspotAddress: {
    fontSize: 13,
    color: '#737373',
    flex: 1,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#262626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 12,
    color: '#737373',
    fontWeight: '500',
  },
  confirmContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  selectedHotspotCard: {
    backgroundColor: '#171717',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  selectedHotspotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  selectedAddress: {
    fontSize: 14,
    color: '#737373',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#737373',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171717',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 14,
  },
  textArea: {
    backgroundColor: '#171717',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 100,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06b6d4',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
  },
  claimButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disclaimer: {
    fontSize: 12,
    color: '#525252',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 18,
  },
});
