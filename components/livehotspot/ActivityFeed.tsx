import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { UserPlus, TrendingUp, Users, Sparkles } from "lucide-react-native";
import { supabase } from "../../lib/supabase";

interface Activity {
  id: string;
  activity_type: "join" | "spike" | "milestone" | "moment";
  message: string;
  created_at: string;
  metadata?: any;
}

interface ActivityFeedProps {
  hotspotId: string;
}

export function ActivityFeed({ hotspotId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    if (!hotspotId) return;

    fetchActivities();
    subscribeToActivities();
  }, [hotspotId]);

  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from("hotspot_activity_feed")
      .select("*")
      .eq("hotspot_id", hotspotId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching activities:", error);
      return;
    }

    if (data) {
      setActivities(data as Activity[]);
    }
  };

  const subscribeToActivities = () => {
    const channel = supabase
      .channel(`activity-${hotspotId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "hotspot_activity_feed",
          filter: `hotspot_id=eq.${hotspotId}`,
        },
        (payload) => {
          const newActivity = payload.new as Activity;
          setActivities((prev) => [newActivity, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getIcon = (type: string) => {
    const iconProps = { color: "rgba(255,255,255,0.7)", size: 16 };
    switch (type) {
      case "join":
        return <UserPlus {...iconProps} />;
      case "spike":
        return <TrendingUp {...iconProps} />;
      case "milestone":
        return <Users {...iconProps} />;
      case "moment":
        return <Sparkles {...iconProps} />;
      default:
        return <Sparkles {...iconProps} />;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const created = new Date(timestamp);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (activities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No recent activity</Text>
        <Text style={styles.emptySubtext}>Activity will appear here</Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {activities.map((activity) => (
        <View key={activity.id} style={styles.activityCard}>
          <View style={styles.iconContainer}>
            {getIcon(activity.activity_type)}
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityMessage}>{activity.message}</Text>
            <Text style={styles.activityTime}>
              {getTimeAgo(activity.created_at)}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    fontSize: 16,
  },
  emptySubtext: {
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    fontSize: 12,
    marginTop: 4,
  },
  activityCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
});
