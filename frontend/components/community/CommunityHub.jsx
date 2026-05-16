import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function CommunityHub({ connectedFarmers, incomingRequests, discoverFarmers, onNavigate }) {
  const availableCount = discoverFarmers.filter((f) => f.status === "discover").length;
  const sentCount = discoverFarmers.filter((f) => f.status === "outgoing").length;

  const sections = [
    {
      key: "requests",
      title: "Connection Requests",
      subtitle: "Review incoming requests from farmers who want to connect with you",
      icon: "mail-open",
      iconBg: "#fff3e7",
      iconColor: "#ef6c00",
      accentBg: "#ef6c00",
      badge: incomingRequests.length,
      stats: [
        { label: "Pending", value: incomingRequests.length, color: "#ef6c00", bg: "#fff3e7" },
      ],
    },
    {
      key: "network",
      title: "Farmer Network",
      subtitle: "Discover and connect with nearby farmers in your region",
      icon: "people",
      iconBg: "#f0ebff",
      iconColor: "#6d28d9",
      accentBg: "#6d28d9",
      badge: availableCount,
      stats: [
        { label: "Available", value: availableCount, color: "#6d28d9", bg: "#f0ebff" },
        { label: "Sent", value: sentCount, color: "#0288d1", bg: "#eaf6fd" },
      ],
    },
    {
      key: "chat",
      title: "Community Chats",
      subtitle: "Share farming knowledge and get advice from your trusted network",
      icon: "chatbubbles",
      iconBg: "#edf8ee",
      iconColor: "#2e7d32",
      accentBg: "#2e7d32",
      badge: connectedFarmers.length,
      stats: [
        { label: "Connected", value: connectedFarmers.length, color: "#2e7d32", bg: "#edf8ee" },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <Ionicons name="people" size={14} color="#fff" />
          <Text style={styles.heroBadgeText}>Farmer Community</Text>
        </View>
        <Text style={styles.heroTitle}>Connect with farmers near you</Text>
        <Text style={styles.heroSubtitle}>
          Manage connections, discover new farmers, and chat directly to share dairy and milk guidance.
        </Text>
        <View style={styles.heroStats}>
          <View style={styles.heroPill}>
            <Ionicons name="chatbubbles" size={14} color="#1565c0" />
            <Text style={styles.heroPillText}>{connectedFarmers.length} active chats</Text>
          </View>
          <View style={styles.heroPill}>
            <Ionicons name="mail" size={14} color="#ef6c00" />
            <Text style={styles.heroPillText}>{incomingRequests.length} pending</Text>
          </View>
        </View>
      </View>

      {/* Section Cards */}
      <Text style={styles.sectionHeading}>Community Sections</Text>

      {sections.map((section) => (
        <TouchableOpacity
          key={section.key}
          style={styles.card}
          activeOpacity={0.88}
          onPress={() => onNavigate(section.key)}
        >
          <View style={styles.cardTopRow}>
            <View style={[styles.cardIconWrap, { backgroundColor: section.iconBg }]}>
              <Ionicons name={section.icon} size={28} color={section.iconColor} />
            </View>
            {section.badge > 0 && (
              <View style={[styles.badge, { backgroundColor: section.accentBg }]}>
                <Text style={styles.badgeText}>{section.badge}</Text>
              </View>
            )}
          </View>

          <Text style={styles.cardTitle}>{section.title}</Text>
          <Text style={styles.cardSubtitle}>{section.subtitle}</Text>

          <View style={styles.cardStats}>
            {section.stats.map((stat, i) => (
              <View key={i} style={[styles.statPill, { backgroundColor: stat.bg }]}>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: stat.color }]}> {stat.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.cardFooter}>
            <Text style={[styles.cardAction, { color: section.iconColor }]}>View section</Text>
            <Ionicons name="arrow-forward" size={16} color={section.iconColor} />
          </View>
        </TouchableOpacity>
      ))}

      {/* Quick Tips */}
      <View style={styles.tipCard}>
        <View style={styles.tipRow}>
          <Ionicons name="bulb" size={18} color="#f59e0b" />
          <Text style={styles.tipTitle}>Farming Tip</Text>
        </View>
        <Text style={styles.tipText}>
          Connect with farmers who specialize in similar cattle and share seasonal feed management techniques.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f5" },
  content: { padding: 16, paddingBottom: 32 },

  hero: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: "#e8f4ff",
    marginBottom: 22,
    shadowColor: "#6da9db",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    boxShadow: "0 6px rgba(109, 169, 219, 0.12)",
    shadowRadius: 16,
    elevation: 4,
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1976d2",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 12,
  },
  heroBadgeText: { marginLeft: 6, color: "#fff", fontSize: 12, fontWeight: "800" },
  heroTitle: { fontSize: 24, fontWeight: "800", color: "#1f2937" },
  heroSubtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, color: "#4b5563" },
  heroStats: { flexDirection: "row", flexWrap: "wrap", marginTop: 14, gap: 8 },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroPillText: { marginLeft: 6, fontSize: 12, fontWeight: "700", color: "#1f2937" },

  sectionHeading: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    shadowColor: "#c0d4c0",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  cardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#1f2937" },
  cardSubtitle: { marginTop: 5, fontSize: 13, lineHeight: 19, color: "#64748b" },
  cardStats: { flexDirection: "row", flexWrap: "wrap", marginTop: 14, gap: 8 },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statValue: { fontSize: 14, fontWeight: "800" },
  statLabel: { fontSize: 12, fontWeight: "600" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 16,
    gap: 5,
  },
  cardAction: { fontSize: 14, fontWeight: "800" },

  tipCard: {
    backgroundColor: "#fffbeb",
    borderRadius: 20,
    padding: 16,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  tipRow: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  tipTitle: { fontSize: 14, fontWeight: "800", color: "#92400e" },
  tipText: { fontSize: 13, lineHeight: 19, color: "#78350f" },
});
