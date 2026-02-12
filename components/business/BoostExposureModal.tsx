import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import {
  getActiveRafflePeriod,
  hasBusinessEnteredRaffle,
  getRaffleEntriesCount,
  enterRaffle,
  RafflePeriod,
} from '../../lib/boostExposureUtils';

interface BoostExposureModalProps {
  visible: boolean;
  onClose: () => void;
  businessId: string;
  category: string;
  alreadyEntered?: boolean; // Pass from parent to avoid race conditions
  onSuccess?: () => void;
}

export default function BoostExposureModal({
  visible,
  onClose,
  businessId,
  category,
  alreadyEntered: initialAlreadyEntered = false,
  onSuccess,
}: BoostExposureModalProps) {
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState(false);
  const [rafflePeriod, setRafflePeriod] = useState<RafflePeriod | null>(null);
  const [alreadyEntered, setAlreadyEntered] = useState(initialAlreadyEntered);
  const [entriesCount, setEntriesCount] = useState(0);

  useEffect(() => {
    if (visible) {
      setAlreadyEntered(initialAlreadyEntered); // Reset to parent state when opening
      loadRaffleData();
    }
  }, [visible, businessId, initialAlreadyEntered]);

  const loadRaffleData = async () => {
    try {
      setLoading(true);
      console.log('📊 [Modal] Loading raffle data for business:', businessId);
      
      // Get active raffle period
      const period = await getActiveRafflePeriod();
      console.log('📊 [Modal] Active period:', period?.id);
      setRafflePeriod(period);

      if (period) {
        // Check if already entered
        console.log('📊 [Modal] Checking entry status...');
        const entered = await hasBusinessEnteredRaffle(businessId);
        console.log('📊 [Modal] Entry status:', entered, '| Initial from parent:', initialAlreadyEntered);
        setAlreadyEntered(entered);

        // Get entries count for category
        const count = await getRaffleEntriesCount(period.id, category);
        console.log('📊 [Modal] Total entries in category:', count);
        setEntriesCount(count);
      }
    } catch (error) {
      console.error('❌ [Modal] Error loading raffle data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnterRaffle = async () => {
    try {
      setEntering(true);
      console.log('🎫 [Modal] Attempting to enter raffle...', { businessId, category });
      
      const result = await enterRaffle(businessId, category);
      console.log('🎫 [Modal] Enter raffle result:', result);
      
      if (result.success) {
        console.log('✅ [Modal] Successfully entered raffle!');
        setAlreadyEntered(true);
        // Reload the data to get updated entry count
        await loadRaffleData();
        onSuccess?.();
      } else {
        console.log('⚠️ [Modal] Failed to enter:', result.error);
        // Check if error is about already being entered
        const errorMsg = result.error?.toLowerCase() || '';
        if (errorMsg.includes('already entered') || 
            errorMsg.includes('duplicate')) {
          // User already entered - update UI to reflect this
          console.log('⚠️ [Modal] Duplicate entry detected, updating UI');
          setAlreadyEntered(true);
          await loadRaffleData();
          alert('You\'ve already entered this raffle!');
        } else {
          alert(result.error || 'Failed to enter raffle');
        }
      }
    } catch (error) {
      console.error('❌ [Modal] Error entering raffle:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setEntering(false);
    }
  };

  const getDaysUntilAnnouncement = () => {
    if (!rafflePeriod) return 0;
    const announcement = new Date(rafflePeriod.announcement_date);
    const today = new Date();
    const diffTime = announcement.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="flash" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Boost Exposure</Text>
              <Text style={styles.headerSubtitle}>Free weekly raffle</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#06b6d4" />
          </View>
        ) : !rafflePeriod ? (
          <View style={styles.noRaffleContainer}>
            <Feather name="alert-circle" size={48} color="#737373" />
            <Text style={styles.noRaffleText}>No active raffle period</Text>
            <Text style={styles.noRaffleSubtext}>Check back soon!</Text>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Intro Card */}
            <View style={styles.introCard}>
              <Text style={styles.sectionTitle}>Get Featured in Search</Text>
              <Text style={styles.introText}>
                Enter the weekly raffle for free featured placement. Only 3 businesses
                per category are chosen each week for sponsored visibility at the top of
                search results.
              </Text>
            </View>

            {/* How It Works */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How It Works</Text>
              <View style={styles.stepsList}>
                <View style={styles.step}>
                  <View style={styles.stepIcon}>
                    <Feather name="trending-up" size={18} color="#06b6d4" />
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Enter the Weekly Raffle</Text>
                    <Text style={styles.stepText}>
                      Join this week's raffle for a chance to be selected. It's completely
                      free—no payment required.
                    </Text>
                  </View>
                </View>

                <View style={styles.step}>
                  <View style={styles.stepIcon}>
                    <Feather name="clock" size={18} color="#06b6d4" />
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>7-Day Sponsored Placement</Text>
                    <Text style={styles.stepText}>
                      Winners get a full week of sponsored placement at the top of search
                      results in their category.
                    </Text>
                  </View>
                </View>

                <View style={styles.step}>
                  <View style={styles.stepIcon}>
                    <Feather name="shield" size={18} color="#06b6d4" />
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Limited & Fair</Text>
                    <Text style={styles.stepText}>
                      Only 3 spots per category means everyone has an equal shot. No
                      bidding, no advantage—just a fair lottery.
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Stats Card */}
            <View style={styles.statsCard}>
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Ionicons name="people" size={24} color="#06b6d4" />
                  <Text style={styles.statValue}>{entriesCount}</Text>
                  <Text style={styles.statLabel}>Entries</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="calendar" size={24} color="#06b6d4" />
                  <Text style={styles.statValue}>{getDaysUntilAnnouncement()}</Text>
                  <Text style={styles.statLabel}>Days Left</Text>
                </View>
              </View>
              <Text style={styles.statsNote}>
                In <Text style={styles.highlight}>{category}</Text> category
              </Text>
            </View>

            {/* Trust Building */}
            <View style={styles.trustCard}>
              <View style={styles.trustHeader}>
                <Feather name="shield" size={20} color="#06b6d4" />
                <Text style={styles.trustTitle}>Why We Limit Sponsored Slots</Text>
              </View>
              <Text style={styles.trustText}>
                We cap the number of boosted businesses to ensure organic discovery
                remains valuable. This isn't pay-to-win—it's a fair tool to help you
                reach customers when you need it most.
              </Text>
            </View>

            {alreadyEntered && (
              <View style={styles.successCard}>
                <Ionicons name="checkmark-circle" size={24} color="#22d3ee" />
                <View style={styles.successContent}>
                  <Text style={styles.successTitle}>You're Entered!</Text>
                  <Text style={styles.successText}>
                    Winners announced in {getDaysUntilAnnouncement()} days
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Footer Button */}
        {!loading && rafflePeriod && (
          <View style={styles.footer}>
            {alreadyEntered ? (
              <TouchableOpacity
                onPress={onClose}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Close</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  onPress={handleEnterRaffle}
                  disabled={entering}
                  style={[styles.primaryButton, entering && styles.buttonDisabled]}
                >
                  {entering ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="flash" size={20} color="#FFFFFF" />
                      <Text style={styles.primaryButtonText}>Enter Raffle - Free</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Maybe Later</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    backgroundColor: '#0a0a0a',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  closeButton: {
    padding: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#737373',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noRaffleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  noRaffleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  noRaffleSubtext: {
    fontSize: 14,
    color: '#737373',
    marginTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  introCard: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  introText: {
    fontSize: 14,
    color: '#d4d4d4',
    lineHeight: 22,
  },
  stepsList: {
    gap: 16,
  },
  step: {
    flexDirection: 'row',
    gap: 12,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 13,
    color: '#a3a3a3',
    lineHeight: 20,
  },
  statsCard: {
    backgroundColor: '#171717',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#262626',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#737373',
  },
  statsNote: {
    fontSize: 13,
    color: '#737373',
    textAlign: 'center',
  },
  highlight: {
    color: '#06b6d4',
    fontWeight: '600',
  },
  trustCard: {
    backgroundColor: 'rgba(64, 64, 64, 0.3)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(64, 64, 64, 0.3)',
    marginBottom: 24,
  },
  trustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  trustText: {
    fontSize: 13,
    color: '#a3a3a3',
    lineHeight: 20,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
    marginBottom: 24,
  },
  successContent: {
    flex: 1,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  successText: {
    fontSize: 13,
    color: '#a3a3a3',
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#262626',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#06b6d4',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: 'rgba(64, 64, 64, 0.5)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(64, 64, 64, 0.5)',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d4d4d4',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
