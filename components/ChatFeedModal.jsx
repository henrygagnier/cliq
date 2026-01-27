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
} from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { supabase } from "../lib/supabase";

const getAvatarColor = (username) => {
  return "#60A5FA"; // Light blue for all avatars
};

const getInitials = (name) => {
  if (!name) return "?";
  if (name === "You") return "Y";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name[0]?.toUpperCase() || "?";
};

export function ChatFeedModal({ hotspot, messages, setMessages, onClose }) {
  console.log("ChatFeedModal rendering with", messages.length, "messages");
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedReactionMessageId, setSelectedReactionMessageId] =
    useState(null);
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log("ChatFeedModal mounted, starting animation");
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        setCurrentUser({
          id: user.id,
          email: user.email,
          full_name: profile?.full_name || user.email?.split("@")[0] || "User",
        });
      }
    };
    getCurrentUser();
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    setSendingMessage(true);
    try {
      const messageData = {
        hotspot_id: hotspot.id,
        user_id: currentUser.id,
        content: newMessage.trim(),
      };

      // Add reply_to_message_id if replying
      if (replyingTo) {
        messageData.reply_to_message_id = replyingTo.id;
      }

      const { error } = await supabase
        .from("hotspot_messages")
        .insert([messageData]);

      if (error) throw error;
      setNewMessage("");
      setReplyingTo(null); // Clear reply state

      // Optimistically add message to UI
      const newMsg = {
        id: Date.now(),
        user_id: currentUser.id,
        username: currentUser.full_name,
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
        reply_to_message_id: replyingTo?.id || null,
        reply_to_username: replyingTo?.username || null,
        reply_to_content: replyingTo?.content || null,
      };
      setMessages([...messages, newMsg]);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAddReaction = async (messageId, emoji) => {
    if (!currentUser) return;

    setTimeout(() => setSelectedReactionMessageId(null), 200);

    try {
      const { data: message, error: fetchError } = await supabase
        .from("hotspot_messages")
        .select("reactions")
        .eq("id", messageId)
        .single();

      if (fetchError) throw fetchError;

      const currentReactions = message.reactions || [];
      const existingReaction = currentReactions.find((r) => r.emoji === emoji);

      let updatedReactions;

      if (existingReaction) {
        const userReactedIds = existingReaction.userIds || [];
        const userAlreadyReacted = userReactedIds.includes(currentUser.id);

        if (userAlreadyReacted) {
          const newUserIds = userReactedIds.filter(
            (id) => id !== currentUser.id,
          );
          if (newUserIds.length === 0) {
            updatedReactions = currentReactions.filter(
              (r) => r.emoji !== emoji,
            );
          } else {
            updatedReactions = currentReactions.map((r) =>
              r.emoji === emoji
                ? { ...r, count: newUserIds.length, userIds: newUserIds }
                : r,
            );
          }
        } else {
          const newUserIds = [...userReactedIds, currentUser.id];
          updatedReactions = currentReactions.map((r) =>
            r.emoji === emoji
              ? { ...r, count: newUserIds.length, userIds: newUserIds }
              : r,
          );
        }
      } else {
        updatedReactions = [
          ...currentReactions,
          { emoji, count: 1, userIds: [currentUser.id] },
        ];
      }

      const { error: updateError } = await supabase
        .from("hotspot_messages")
        .update({ reactions: updatedReactions })
        .eq("id", messageId);

      if (updateError) throw updateError;

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          return { ...m, reactions: updatedReactions };
        }),
      );
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  const handleReply = (message) => {
    setReplyingTo(message);
    setSelectedReactionMessageId(null);
  };

  const handleClose = () => {
    console.log("Closing chat modal");
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
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
            <View>
              <Text style={styles.modalTitle}>{hotspot.name}</Text>
              <View style={styles.liveIndicatorRow}>
                <View style={styles.liveIndicator} />
                <Text style={styles.liveBadgeText}>Live Chat</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <FontAwesome6 name="xmark" size={20} color="#60A5FA" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => {
              const isCurrentUser = msg.user_id === currentUser?.id;
              const displayName = isCurrentUser ? "You" : msg.username;
              const isSelected = selectedReactionMessageId === msg.id;

              return (
                <TouchableOpacity
                  key={msg.id}
                  style={styles.messageItem}
                  activeOpacity={0.8}
                  onLongPress={() => setSelectedReactionMessageId(msg.id)}
                >
                  {/* Avatar */}
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: getAvatarColor(displayName) },
                    ]}
                  >
                    {isCurrentUser ? (
                      <FontAwesome6 name="user" size={18} color="white" />
                    ) : (
                      <Text style={styles.avatarText}>
                        {getInitials(displayName)}
                      </Text>
                    )}
                  </View>

                  {/* Message Content */}
                  <View style={styles.messageContent}>
                    <View style={styles.messageHeader}>
                      <Text
                        style={[
                          styles.messageUser,
                          isCurrentUser && styles.messageUserSelf,
                        ]}
                      >
                        {displayName}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <Text style={styles.messageTime}>
                          {getTimeAgo(msg.created_at)}
                        </Text>
                        <TouchableOpacity onPress={() => handleReply(msg)}>
                          <FontAwesome6
                            name="reply"
                            size={14}
                            color="#71717A"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Reply indicator */}
                    {msg.reply_to_message_id && msg.reply_to_content && (
                      <View style={styles.replyIndicator}>
                        <View style={styles.replyBar} />
                        <View style={styles.replyContent}>
                          <Text style={styles.replyUsername}>
                            {msg.reply_to_username || "Unknown"}
                          </Text>
                          <Text style={styles.replyText} numberOfLines={1}>
                            {msg.reply_to_content}
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.messageBubble}>
                      <Text style={styles.messageText}>{msg.content}</Text>
                    </View>

                    {/* Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <View style={styles.reactionsContainer}>
                        {msg.reactions.map((reaction, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.reactionBubble}
                            onPress={() =>
                              handleAddReaction(msg.id, reaction.emoji)
                            }
                          >
                            <Text style={styles.reactionEmoji}>
                              {reaction.emoji}
                            </Text>
                            <Text style={styles.reactionCount}>
                              {reaction.count}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Reaction bar */}
                    {isSelected && (
                      <View style={styles.reactionBar}>
                        {["❤️", "😂", "👍", "🔥", "😮", "😢"].map((emoji) => (
                          <TouchableOpacity
                            key={emoji}
                            style={styles.reactionButton}
                            onPress={() => handleAddReaction(msg.id, emoji)}
                          >
                            <Text style={styles.reactionButtonEmoji}>
                              {emoji}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Input */}
          <View style={styles.inputContainer}>
            {replyingTo && (
              <View style={styles.replyingToContainer}>
                <View style={styles.replyingToContent}>
                  <Text style={styles.replyingToLabel}>
                    Replying to {replyingTo.username}
                  </Text>
                  <Text style={styles.replyingToText} numberOfLines={1}>
                    {replyingTo.content}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <FontAwesome6 name="xmark" size={16} color="#71717A" />
                </TouchableOpacity>
              </View>
            )}
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
                <FontAwesome6 name="paper-plane" size={18} color="white" />
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    zIndex: 100,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: "#18181B", // zinc-900
    height: "100%",
    width: "100%",
    borderTopWidth: 1,
    borderColor: "#27272A",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#27272A",
    backgroundColor: "rgba(24, 24, 27, 0.95)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  liveIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F97316",
  },
  liveBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F97316",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#27272A",
    justifyContent: "center",
    alignItems: "center",
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 80,
  },
  messageItem: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  messageContent: {
    flex: 1,
    minWidth: 0,
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  messageUser: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  messageUserSelf: {
    color: "#3B82F6",
  },
  messageTime: {
    fontSize: 12,
    color: "#71717A", // zinc-500
  },
  messageBubble: {
    backgroundColor: "rgba(39, 39, 42, 0.7)", // zinc-800/70
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  messageText: {
    fontSize: 14,
    color: "#E4E4E7", // zinc-200
    lineHeight: 20,
  },
  replyIndicator: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-start",
  },
  replyBar: {
    width: 3,
    backgroundColor: "#60A5FA",
    borderRadius: 2,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
    backgroundColor: "rgba(96, 165, 250, 0.1)",
    padding: 8,
    borderRadius: 8,
  },
  replyUsername: {
    fontSize: 12,
    fontWeight: "600",
    color: "#60A5FA",
    marginBottom: 2,
  },
  replyText: {
    fontSize: 12,
    color: "#A1A1AA",
  },
  reactionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  reactionBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#60A5FA",
  },
  reactionBar: {
    flexDirection: "row",
    backgroundColor: "#27272A",
    borderRadius: 20,
    padding: 8,
    marginTop: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: "#3F3F46",
  },
  reactionButton: {
    padding: 4,
  },
  reactionButtonEmoji: {
    fontSize: 20,
  },
  inputContainer: {
    padding: 16,
    backgroundColor: "rgba(24, 24, 27, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "#27272A",
  },
  replyingToContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#27272A",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#60A5FA",
  },
  replyingToContent: {
    flex: 1,
  },
  replyingToLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#60A5FA",
    marginBottom: 2,
  },
  replyingToText: {
    fontSize: 12,
    color: "#A1A1AA",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#27272A", // zinc-800
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "white",
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#52525B", // zinc-600
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  sendButtonDisabled: {
    backgroundColor: "#3F3F46",
    shadowOpacity: 0,
  },
});
