import { supabase } from "./supabase";

export interface Connection {
  id: string;
  user_id: string;
  connected_user_id: string;
  location: string;
  met_date: string;
  notes?: string;
  mutual_count: number;
  is_active: boolean;
  is_recent: boolean;
  created_at: string;
  // Joined fields from user_profiles
  connected_user_name?: string;
  connected_user_photo?: string;
  connected_user_email?: string;
}

export interface Message {
  id: string;
  connection_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface DMConversation {
  connection: Connection;
  lastMessage?: Message;
  unreadCount: number;
}

/**
 * Get all connections for the current user
 */
export async function getUserConnections(
  userId: string,
): Promise<Connection[]> {
  const { data, error } = await supabase
    .from("connection_details")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching connections:", error);
    return [];
  }

  return data || [];
}

/**
 * Get recent connections (within last 7 days)
 */
export async function getRecentConnections(
  userId: string,
): Promise<Connection[]> {
  const { data, error } = await supabase
    .from("connection_details")
    .select("*")
    .eq("user_id", userId)
    .eq("is_recent", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching recent connections:", error);
    return [];
  }

  return data || [];
}

/**
 * Get older connections (older than 7 days)
 */
export async function getOlderConnections(
  userId: string,
): Promise<Connection[]> {
  const { data, error } = await supabase
    .from("connection_details")
    .select("*")
    .eq("user_id", userId)
    .eq("is_recent", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching older connections:", error);
    return [];
  }

  return data || [];
}

/**
 * Create a new connection
 */
export async function createConnection(
  userId: string,
  connectedUserId: string,
  location: string,
  notes?: string,
  metDate?: Date,
): Promise<Connection | null> {
  const { data, error } = await supabase
    .from("connections")
    .insert({
      user_id: userId,
      connected_user_id: connectedUserId,
      location,
      notes,
      met_date: metDate || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating connection:", error);
    return null;
  }

  return data;
}

/**
 * Update connection notes
 */
export async function updateConnectionNotes(
  connectionId: string,
  notes: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("connections")
    .update({ notes })
    .eq("id", connectionId);

  if (error) {
    console.error("Error updating connection notes:", error);
    return false;
  }

  return true;
}

/**
 * Send a message
 */
export async function sendMessage(
  connectionId: string,
  senderId: string,
  receiverId: string,
  content: string,
): Promise<Message | null> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      connection_id: connectionId,
      sender_id: senderId,
      receiver_id: receiverId,
      content,
    })
    .select()
    .single();

  if (error) {
    console.error("Error sending message:", error);
    return null;
  }

  return data;
}

/**
 * Mark messages as read (marks all unread messages sent to the current user)
 */
export async function markMessagesAsRead(
  connectionId: string,
  userId: string,
): Promise<boolean> {
  // Mark all unread messages where the current user is the receiver
  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("receiver_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error("Error marking messages as read:", error);
    return false;
  }

  return true;
}

/**
 * Get messages for a connection (queries by sender/receiver, not connection_id)
 */
export async function getConnectionMessages(
  connectionId: string,
  limit: number = 50,
): Promise<Message[]> {
  // First, get the connection to find the two users involved
  const { data: connection } = await supabase
    .from("connections")
    .select("user_id, connected_user_id")
    .eq("id", connectionId)
    .single();

  if (!connection) {
    console.error("Connection not found");
    return [];
  }

  const user1 = connection.user_id;
  const user2 = connection.connected_user_id;

  // Get all messages between these two users (regardless of connection_id)
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${user1},receiver_id.eq.${user2}),and(sender_id.eq.${user2},receiver_id.eq.${user1})`,
    )
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }

  return data || [];
}

/**
 * Delete a connection
 */
export async function deleteConnection(connectionId: string): Promise<boolean> {
  const { error } = await supabase
    .from("connections")
    .delete()
    .eq("id", connectionId);

  if (error) {
    console.error("Error deleting connection:", error);
    return false;
  }

  return true;
}

/**
 * Format relative time (e.g., "2 days ago", "1 week ago")
 */
export function formatRelativeTime(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks === 1) return "1 week ago";
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
  if (diffMonths === 1) return "1 month ago";
  if (diffMonths < 12) return `${diffMonths} months ago`;

  return past.toLocaleDateString();
}

/**
 * Get DM conversations for a user with last message info
 */
export async function getDMConversations(
  userId: string,
): Promise<DMConversation[]> {
  // First get all connections
  const connections = await getUserConnections(userId);

  if (connections.length === 0) {
    return [];
  }

  // Get the last message for each connection
  const conversationsWithMessages = await Promise.all(
    connections.map(async (connection) => {
      // Get last message in this conversation (either direction)
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .eq("connection_id", connection.id)
        .order("created_at", { ascending: false })
        .limit(1);

      // Get unread count (messages sent to current user that are unread)
      const { count: unreadCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("connection_id", connection.id)
        .eq("receiver_id", userId)
        .eq("is_read", false);

      return {
        connection,
        lastMessage: messages?.[0] || undefined,
        unreadCount: unreadCount || 0,
      };
    }),
  );

  // Filter out conversations with no messages and sort by last message time
  const conversationsWithDMs = conversationsWithMessages
    .filter((conv) => conv.lastMessage)
    .sort((a, b) => {
      const timeA = new Date(a.lastMessage!.created_at).getTime();
      const timeB = new Date(b.lastMessage!.created_at).getTime();
      return timeB - timeA; // Most recent first
    });

  return conversationsWithDMs;
}
