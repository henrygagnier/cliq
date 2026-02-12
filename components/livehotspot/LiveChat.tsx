import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
} from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { supabase } from "../../lib/supabase";

interface Message {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string | null;
  content: string;
  created_at: string;
  reply_to_message_id?: string | null;
  reply_to_username?: string | null;
  reply_to_content?: string | null;
  reactions?: Array<{
    emoji: string;
    count: number;
    userIds: string[];
  }>;
}

interface LiveChatProps {
  hotspotId: string;
  currentUser: any;
}

const getAvatarColor = (username: string) => {
  return "#60A5FA"; // Light blue for all avatars
};

const getInitials = (name: string) => {
  if (!name) return "?";
  if (name === "You") return "Y";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name[0]?.toUpperCase() || "?";
};

export function LiveChat({ hotspotId, currentUser }: LiveChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedReactionMessageId, setSelectedReactionMessageId] = useState<
    string | null
  >(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!hotspotId) return;

    fetchMessages();
    const cleanup = subscribeToMessages();
    return cleanup;
  }, [hotspotId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("hotspot_messages")
      .select(
        `
        id,
        user_id,
        content,
        created_at,
        reply_to_message_id,
        reactions,
        moderation_status,
        user_profiles!hotspot_messages_user_id_fkey (
          full_name,
          avatar_url
        )
      `,
      )
      .eq("hotspot_id", hotspotId)
      .or('moderation_status.is.null,moderation_status.eq.approved')
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    if (data) {
      // Transform messages to include reply information
      const transformedMessages = await Promise.all(
        data.map(async (msg: any) => {
          let replyInfo = {};

          if (msg.reply_to_message_id) {
            const { data: replyMsg } = await supabase
              .from("hotspot_messages")
              .select(
                `
                content,
                moderation_status,
                user_profiles!hotspot_messages_user_id_fkey (
                  full_name
                )
              `,
              )
              .eq("id", msg.reply_to_message_id)
              .or('moderation_status.is.null,moderation_status.eq.approved')
              .single();

            if (replyMsg) {
              replyInfo = {
                reply_to_username:
                  (replyMsg as any).user_profiles?.full_name || "Unknown",
                reply_to_content: replyMsg.content,
              };
            }
          }

          return {
            id: msg.id,
            user_id: msg.user_id,
            username: msg.user_profiles?.full_name || "Anonymous",
            avatar_url: msg.user_profiles?.avatar_url,
            content: msg.content,
            created_at: msg.created_at,
            reply_to_message_id: msg.reply_to_message_id,
            reactions: msg.reactions || [],
            ...replyInfo,
          };
        }),
      );

      setMessages(transformedMessages);
      
      // Scroll to bottom after loading messages
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages-${hotspotId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "hotspot_messages",
          filter: `hotspot_id=eq.${hotspotId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;

          // Skip rejected messages
          if (newMsg.moderation_status === 'rejected') {
            return;
          }

          // Skip if this message already exists (from optimistic update)
          setMessages((prevMessages) => {
            const messageExists = prevMessages.some((m) => m.id === newMsg.id);
            if (messageExists) {
              return prevMessages;
            }

            // Fetch user profile for the new message
            const fetchAndAddMessage = async () => {
              const { data: profile } = await supabase
                .from("user_profiles")
                .select("full_name, avatar_url")
                .eq("id", newMsg.user_id)
                .single();

              let replyInfo = {};
              if (newMsg.reply_to_message_id) {
                const { data: replyMsg } = await supabase
                  .from("hotspot_messages")
                  .select(
                    `
                    content,
                    moderation_status,
                    user_profiles!hotspot_messages_user_id_fkey (
                      full_name
                    )
                  `,
                  )
                  .eq("id", newMsg.reply_to_message_id)
                  .or('moderation_status.is.null,moderation_status.eq.approved')
                  .single();

                if (replyMsg) {
                  replyInfo = {
                    reply_to_username:
                      (replyMsg as any).user_profiles?.full_name || "Unknown",
                    reply_to_content: replyMsg.content,
                  };
                }
              }

              setMessages((prev) => [
                ...prev,
                {
                  id: newMsg.id,
                  user_id: newMsg.user_id,
                  username: profile?.full_name || "Anonymous",
                  avatar_url: profile?.avatar_url,
                  content: newMsg.content,
                  created_at: newMsg.created_at,
                  reply_to_message_id: newMsg.reply_to_message_id,
                  reactions: newMsg.reactions || [],
                  ...replyInfo,
                },
              ]);

              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 100);
            };

            fetchAndAddMessage();
            return prevMessages;
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "hotspot_messages",
          filter: `hotspot_id=eq.${hotspotId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as any;
          
          // Remove message if it was rejected by moderation
          if (updatedMsg.moderation_status === 'rejected') {
            setMessages((prev) => prev.filter((m) => m.id !== updatedMsg.id));
          } else {
            // Update reactions or other fields
            setMessages((prev) =>
              prev.map((m) =>
                m.id === updatedMsg.id
                  ? { ...m, reactions: updatedMsg.reactions || [] }
                  : m,
              ),
            );
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "hotspot_messages",
          filter: `hotspot_id=eq.${hotspotId}`,
        },
        (payload) => {
          const deletedMsg = payload.old as any;
          setMessages((prev) => prev.filter((m) => m.id !== deletedMsg.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    const messageContent = newMessage.trim();
    const replyData = replyingTo;
    
    // Clear input and reply state immediately
    setNewMessage("");
    setReplyingTo(null);

    setSendingMessage(true);
    
    // Create optimistic message with temporary ID
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      user_id: currentUser.id,
      username: currentUser.full_name || "Anonymous",
      avatar_url: currentUser.avatar_url,
      content: messageContent,
      created_at: new Date().toISOString(),
      reply_to_message_id: replyData?.id || null,
      reply_to_username: replyData?.username || null,
      reply_to_content: replyData?.content || null,
      reactions: [],
    };

    // Add optimistic message immediately
    setMessages((prev) => [...prev, optimisticMessage]);
    
    // Scroll to bottom immediately
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      const messageData: any = {
        hotspot_id: hotspotId,
        user_id: currentUser.id,
        content: messageContent,
      };

      // Add reply_to_message_id if replying
      if (replyData) {
        messageData.reply_to_message_id = replyData.id;
      }

      const { data, error } = await supabase
        .from("hotspot_messages")
        .insert([messageData])
        .select()
        .single();

      if (error) throw error;
      
      // Replace optimistic message with real one from server
      if (data) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId
              ? {
                  ...optimisticMessage,
                  id: data.id,
                  created_at: data.created_at,
                }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
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
      const existingReaction = currentReactions.find(
        (r: any) => r.emoji === emoji,
      );

      let updatedReactions;

      if (existingReaction) {
        const userReactedIds = existingReaction.userIds || [];
        const userAlreadyReacted = userReactedIds.includes(currentUser.id);

        if (userAlreadyReacted) {
          const newUserIds = userReactedIds.filter(
            (id: string) => id !== currentUser.id,
          );
          if (newUserIds.length === 0) {
            updatedReactions = currentReactions.filter(
              (r: any) => r.emoji !== emoji,
            );
          } else {
            updatedReactions = currentReactions.map((r: any) =>
              r.emoji === emoji
                ? { ...r, count: newUserIds.length, userIds: newUserIds }
                : r,
            );
          }
        } else {
          const newUserIds = [...userReactedIds, currentUser.id];
          updatedReactions = currentReactions.map((r: any) =>
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

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    setSelectedReactionMessageId(null);
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={100}
    >
      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Be the first to say hi! 👋</Text>
          </View>
        ) : (
          messages.map((msg) => {
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
                  {msg.avatar_url ? (
                    <Image
                      source={{ uri: msg.avatar_url }}
                      style={styles.avatarImage}
                    />
                  ) : isCurrentUser ? (
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
                        <FontAwesome6 name="reply" size={14} color="#71717A" />
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
                    <View style={styles.reactionBarContainer}>
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
          })
        )}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 400,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 16,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    color: "#E4E4E7",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    color: "#71717A",
    textAlign: "center",
    fontSize: 14,
    marginTop: 4,
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
    overflow: "hidden",
  },
  avatarImage: {
    width: 40,
    height: 40,
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
    color: "#71717A",
  },
  messageBubble: {
    backgroundColor: "rgba(39, 39, 42, 0.7)",
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  messageText: {
    fontSize: 14,
    color: "#E4E4E7",
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
  reactionBarContainer: {
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
    backgroundColor: "#1a1a1a",
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
    backgroundColor: "#1F1F23",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "white",
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#3F3F46",
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
