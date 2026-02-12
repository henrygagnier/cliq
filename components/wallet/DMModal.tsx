import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
} from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { supabase } from "../../lib/supabase";
import type { Connection, Message } from "../../lib/walletUtils";
import {
  sendMessage,
  getConnectionMessages,
  markMessagesAsRead,
} from "../../lib/walletUtils";

interface DMModalProps {
  connection: Connection;
  currentUserId: string;
  currentHotspot?: string | null;
  onClose: () => void;
}

function getTimeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name[0]?.toUpperCase() || "?";
}

export function DMModal({
  connection,
  currentUserId,
  currentHotspot,
  onClose,
}: DMModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const locationDisplay = currentHotspot || "Not at a hotspot";

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    loadMessages();
    markMessagesAsRead(connection.id, currentUserId);

    // Subscribe to new messages between these two users
    // Listen for messages where current user is sender OR receiver
    const channel = supabase
      .channel(`dm-${currentUserId}-${connection.connected_user_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${currentUserId},receiver_id=eq.${connection.connected_user_id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${connection.connected_user_id},receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);

          // Mark as read if we're the receiver
          markMessagesAsRead(connection.id, currentUserId);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connection.id, currentUserId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  async function loadMessages() {
    setLoading(true);
    const msgs = await getConnectionMessages(connection.id);
    setMessages(msgs);
    setLoading(false);
  }

  async function handleSendMessage() {
    if (!newMessage.trim()) return;

    setSendingMessage(true);
    try {
      console.log("Sending message:", {
        connectionId: connection.id,
        senderId: currentUserId,
        receiverId: connection.connected_user_id,
      });

      const msg = await sendMessage(
        connection.id,
        currentUserId,
        connection.connected_user_id,
        newMessage.trim(),
      );

      if (msg) {
        setMessages([...messages, msg]);
        setNewMessage("");
        console.log("Message sent successfully:", msg);
      } else {
        console.error("Failed to send message - no data returned");
        alert("Failed to send message. Please try again.");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Error sending message: " + error.message);
    } finally {
      setSendingMessage(false);
    }
  }

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  return (
    <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              {connection.connected_user_photo ? (
                <Image
                  source={{ uri: connection.connected_user_photo }}
                  style={styles.headerAvatar}
                />
              ) : (
                <View style={styles.headerAvatarPlaceholder}>
                  <Text style={styles.headerAvatarText}>
                    {getInitials(connection.connected_user_name || "?")}
                  </Text>
                </View>
              )}
              <View>
                <Text style={styles.modalTitle}>
                  {connection.connected_user_name || "Unknown User"}
                </Text>
                <Text style={styles.locationText}>{locationDisplay}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <FontAwesome6 name="xmark" size={20} color="#60A5FA" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyState}>
                  <FontAwesome6
                    name="comment-dots"
                    size={48}
                    color="rgba(255, 255, 255, 0.2)"
                  />
                  <Text style={styles.emptyText}>No messages yet</Text>
                  <Text style={styles.emptySubtext}>
                    Start the conversation!
                  </Text>
                </View>
              ) : (
                messages.map((msg) => {
                  const isCurrentUser = msg.sender_id === currentUserId;

                  return (
                    <View
                      key={msg.id}
                      style={[
                        styles.messageItem,
                        isCurrentUser && styles.messageItemSelf,
                      ]}
                    >
                      {!isCurrentUser && (
                        <View style={styles.avatarSmall}>
                          {connection.connected_user_photo ? (
                            <Image
                              source={{ uri: connection.connected_user_photo }}
                              style={styles.avatarSmallImage}
                            />
                          ) : (
                            <Text style={styles.avatarSmallText}>
                              {getInitials(
                                connection.connected_user_name || "?",
                              )}
                            </Text>
                          )}
                        </View>
                      )}

                      <View
                        style={[
                          styles.messageBubble,
                          isCurrentUser
                            ? styles.messageBubbleSelf
                            : styles.messageBubbleOther,
                        ]}
                      >
                        <Text
                          style={[
                            styles.messageText,
                            isCurrentUser && styles.messageTextSelf,
                          ]}
                        >
                          {msg.content}
                        </Text>
                        <Text
                          style={[
                            styles.messageTime,
                            isCurrentUser && styles.messageTimeSelf,
                          ]}
                        >
                          {getTimeAgo(msg.created_at)}
                        </Text>
                      </View>

                      {isCurrentUser && <View style={styles.avatarSpacer} />}
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                placeholderTextColor="#71717A"
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                onPress={handleSendMessage}
                style={[
                  styles.sendButton,
                  (!newMessage.trim() || sendingMessage) &&
                    styles.sendButtonDisabled,
                ]}
                disabled={!newMessage.trim() || sendingMessage}
              >
                <FontAwesome6
                  name="paper-plane"
                  size={18}
                  color={
                    newMessage.trim() && !sendingMessage ? "#FFFFFF" : "#71717A"
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    zIndex: 1000,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#18181B",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%",
    paddingTop: 20,
    
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#60A5FA",
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  locationText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 14,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 14,
    marginTop: 8,
  },
  messageItem: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-end",
    gap: 8,
  },
  messageItemSelf: {
    flexDirection: "row-reverse",
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#60A5FA",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarSmallImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarSmallText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  avatarSpacer: {
    width: 32,
  },
  messageBubble: {
    maxWidth: "70%",
    borderRadius: 16,
    padding: 12,
  },
  messageBubbleOther: {
    backgroundColor: "#27272A",
    borderBottomLeftRadius: 4,
  },
  messageBubbleSelf: {
    backgroundColor: "#60A5FA",
    borderBottomRightRadius: 4,
  },
  messageText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextSelf: {
    color: "#FFFFFF",
  },
  messageTime: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 11,
    marginTop: 4,
  },
  messageTimeSelf: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#18181B",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#27272A",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#FFFFFF",
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#60A5FA",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#27272A",
  },
});
