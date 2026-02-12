import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface ChatModerationModalProps {
  visible: boolean;
  onClose: () => void;
  businessId: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  type: string;
  is_moderated: boolean;
  moderation_status: string | null;
  created_at: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
}

export default function ChatModerationModal({
  visible,
  onClose,
  businessId,
}: ChatModerationModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    if (visible) {
      loadMessages();
    }
  }, [visible, filter]);

  const loadMessages = async () => {
    try {
      setLoading(true);

      // Get business profile to find associated hotspot
      const { data: profile } = await supabase
        .from('business_profiles')
        .select('hotspot_id')
        .eq('id', businessId)
        .single();

      let allMessages: ChatMessage[] = [];

      if (profile && profile.hotspot_id) {
        // Fetch hotspot messages using hotspot_id UUID from business profile
        const { data: hotspotMessages, error } = await supabase
          .from('hotspot_messages_with_replies')
          .select('id, user_id, content, type, created_at, full_name, email, avatar_url, moderation_status')
          .eq('hotspot_id', profile.hotspot_id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (hotspotMessages && hotspotMessages.length > 0) {
          // Transform hotspot messages to match ChatMessage interface
          allMessages = hotspotMessages.map((msg) => ({
            id: msg.id,
            user_id: msg.user_id,
            content: msg.content,
            type: msg.type || 'text',
            is_moderated: msg.moderation_status !== null,
            moderation_status: msg.moderation_status,
            created_at: msg.created_at,
            full_name: msg.full_name,
            email: msg.email,
            avatar_url: msg.avatar_url,
          }));
        }
      }

      // Apply filter based on moderation status
      if (filter === 'pending') {
        allMessages = allMessages.filter(m => m.moderation_status === null);
      } else if (filter === 'approved') {
        allMessages = allMessages.filter(m => m.moderation_status === 'approved');
      } else if (filter === 'rejected') {
        allMessages = allMessages.filter(m => m.moderation_status === 'rejected');
      }
      // 'all' shows everything

      setMessages(allMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleModerate = async (messageId: string, status: 'approved' | 'rejected') => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) {
        console.error('Message not found:', messageId);
        return;
      }

      console.log('Updating message:', messageId, 'to status:', status);

      // Update moderation_status in the database
      const { data, error } = await supabase
        .from('hotspot_messages')
        .update({ moderation_status: status })
        .eq('id', messageId)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        Alert.alert('Error', `Failed to ${status} message: ${error.message}`);
        return;
      }

      console.log('Update result:', data);

      // Update local state
      setMessages(messages.map((m) => 
        m.id === messageId 
          ? { ...m, is_moderated: true, moderation_status: status }
          : m
      ));

      Alert.alert('Success', `Message ${status} successfully`);
    } catch (error) {
      console.error('Error moderating message:', error);
      Alert.alert('Error', `Failed to moderate message: ${error.message || 'Unknown error'}`);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMessages();
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'review':
        return 'star';
      case 'message':
        return 'chatbubbles';
      case 'comment':
        return 'chatbox';
      default:
        return 'chatbox-ellipses';
    }
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'review':
        return '#eab308';
      case 'message':
        return '#22d3ee';
      case 'comment':
        return '#a855f7';
      default:
        return '#737373';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.headerTitle}>Chat Moderation</Text>
                <Text style={styles.headerSubtitle}>
                  Review and moderate user messages
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#a3a3a3" />
              </TouchableOpacity>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterTabs}>
              {[
                { id: 'all', label: 'All' },
                { id: 'pending', label: 'Pending' },
                { id: 'approved', label: 'Approved' },
                { id: 'rejected', label: 'Rejected' },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setFilter(tab.id as any)}
                  style={[
                    styles.filterTab,
                    filter === tab.id ? styles.filterTabActive : styles.filterTabInactive
                  ]}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      filter === tab.id ? styles.filterTabTextActive : styles.filterTabTextInactive
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Messages List */}
          <ScrollView
            style={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06b6d4" />
            }
          >
            {loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Loading messages...</Text>
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={64}
                  color="#404040"
                  style={styles.emptyIcon}
                />
                <Text style={styles.emptyText}>
                  {filter === 'pending' ? 'No pending messages' : 'No messages found'}
                </Text>
              </View>
            ) : (
              <View style={styles.messagesList}>
                {messages.map((message) => (
                  <View
                    key={message.id}
                    style={styles.messageCard}
                  >
                    {/* Message Header */}
                    <View style={styles.messageHeader}>
                      <View style={styles.messageHeaderLeft}>
                        <View
                          style={[styles.messageTypeIcon, { backgroundColor: `${getMessageTypeColor(message.type)}33` }]}
                        >
                          <Ionicons
                            name={getMessageTypeIcon(message.type) as any}
                            size={16}
                            color={getMessageTypeColor(message.type)}
                          />
                        </View>
                        <View style={styles.flexOne}>
                          <Text style={styles.messageUser}>
                            {message.full_name || message.email || 'Anonymous'}
                          </Text>
                          <Text style={styles.messageDate}>
                            {formatDate(message.created_at)}
                          </Text>
                        </View>
                      </View>

                      {/* Status Badge */}
                      {message.is_moderated && (
                        <View
                          style={[
                            styles.statusBadge,
                            message.moderation_status === 'approved' ? styles.statusBadgeApproved : styles.statusBadgeRejected
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              message.moderation_status === 'approved' ? styles.statusBadgeTextApproved : styles.statusBadgeTextRejected
                            ]}
                          >
                            {message.moderation_status}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Message Content */}
                    <Text style={styles.messageContent}>{message.content}</Text>

                    {/* Action Buttons (only for pending messages) */}
                    {!message.is_moderated && (
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          onPress={() => handleModerate(message.id, 'approved')}
                          style={styles.approveButton}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color="#22c55e"
                            style={{ marginRight: 6 }}
                          />
                          <Text style={styles.approveButtonText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleModerate(message.id, 'rejected')}
                          style={styles.rejectButton}
                        >
                          <Ionicons
                            name="close-circle"
                            size={18}
                            color="#ef4444"
                            style={{ marginRight: 6 }}
                          />
                          <Text style={styles.rejectButtonText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
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
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(38,38,38,0.5)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  filterTabs: {
    flexDirection: 'row',
    gap: 10,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterTabActive: {
    backgroundColor: '#06b6d4',
    borderColor: 'rgba(34, 211, 238, 0.5)',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  filterTabInactive: {
    backgroundColor: 'rgba(38,38,38,0.5)',
    borderColor: 'rgba(64,64,64,0.3)',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  filterTabTextInactive: {
    color: '#a3a3a3',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  emptyContainer: {
    paddingVertical: 60,
  },
  emptyIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: '#a3a3a3',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
  },
  messagesList: {
    gap: 14,
  },
  messageCard: {
    backgroundColor: 'rgba(38,38,38,0.5)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(64,64,64,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  messageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  messageTypeIcon: {
    padding: 10,
    borderRadius: 12,
  },
  flexOne: {
    flex: 1,
  },
  messageUser: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: -0.3,
  },
  messageDate: {
    fontSize: 13,
    color: '#737373',
    marginTop: 2,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeApproved: {
    backgroundColor: 'rgba(34,197,94,0.2)',
  },
  statusBadgeRejected: {
    backgroundColor: 'rgba(239,68,68,0.2)',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadgeTextApproved: {
    color: '#4ade80',
  },
  statusBadgeTextRejected: {
    color: '#f87171',
  },
  messageContent: {
    color: '#e5e5e5',
    marginBottom: 14,
    lineHeight: 22,
    fontSize: 15,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderColor: 'rgba(64,64,64,0.3)',
  },
  approveButton: {
    flex: 1,
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  approveButtonText: {
    color: '#4ade80',
    fontWeight: '700',
    fontSize: 14,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f87171',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  rejectButtonText: {
    color: '#f87171',
    fontWeight: '700',
    fontSize: 14,
  },
});
