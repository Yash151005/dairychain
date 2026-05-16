import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ProfileAvatar from "../profile-avatar";

const statusConfig = {
  discover: {
    label: "Available to connect",
    accent: "#6d28d9",
    bg: "#f0ebff",
    icon: "person-add",
  },
  outgoing: {
    label: "Request sent",
    accent: "#0288d1",
    bg: "#eaf6fd",
    icon: "paper-plane",
  },
};

function BackHeader({ onBack, title }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={20} color="#6d28d9" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerRight} />
    </View>
  );
}

function FarmerCard({ farmer, onSendRequest, isBusy }) {
  const config = statusConfig[farmer.status];
  const isDiscover = farmer.status === "discover";

  return (
    <View style={styles.farmerCard}>
      <View style={styles.cardTop}>
        <ProfileAvatar
          uri={farmer.profile_image}
          name={farmer.name}
          size={52}
          borderRadius={18}
          backgroundColor={config.bg}
          textColor={config.accent}
          style={styles.avatarWrap}
        />
        <View style={styles.farmerInfo}>
          <Text style={styles.farmerName}>{farmer.name}</Text>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={13} color="#64748b" />
            <Text style={styles.detailText}>{farmer.village}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="leaf-outline" size={13} color="#2e7d32" />
            <Text style={styles.detailText}>{farmer.specialty}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={13} color="#94a3b8" />
            <Text style={[styles.detailText, { color: "#94a3b8" }]}>{farmer.lastSeen}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <View style={[styles.statusPill, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon} size={13} color={config.accent} />
          <Text style={[styles.statusText, { color: config.accent }]}>{config.label}</Text>
        </View>

        {isDiscover && (
          <TouchableOpacity
            style={[styles.connectBtn, isBusy && styles.connectBtnDisabled]}
            activeOpacity={0.85}
            onPress={() => onSendRequest(farmer.id)}
            disabled={isBusy}
          >
            <Ionicons name="person-add" size={15} color="#fff" />
            <Text style={styles.connectBtnText}>Connect</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function NetworkScreen({
  discoverFarmers,
  onSendRequest,
  onBack,
  isBusy = false,
}) {
  const available = discoverFarmers.filter((f) => f.status === "discover");
  const sent = discoverFarmers.filter((f) => f.status === "outgoing");

  return (
    <View style={styles.container}>
      <BackHeader onBack={onBack} title="Farmer Network" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: "#f0ebff" }]}>
            <Ionicons name="people" size={22} color="#6d28d9" />
            <Text style={[styles.statNum, { color: "#6d28d9" }]}>{available.length}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#eaf6fd" }]}>
            <Ionicons name="paper-plane" size={22} color="#0288d1" />
            <Text style={[styles.statNum, { color: "#0288d1" }]}>{sent.length}</Text>
            <Text style={styles.statLabel}>Requests Sent</Text>
          </View>
        </View>

        {available.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Discover Farmers - {available.length}</Text>
            {available.map((farmer) => (
              <FarmerCard
                key={farmer.id}
                farmer={farmer}
                onSendRequest={onSendRequest}
                isBusy={isBusy}
              />
            ))}
          </>
        )}

        {sent.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: available.length > 0 ? 8 : 0 }]}>
              Sent Requests - {sent.length}
            </Text>
            {sent.map((farmer) => (
              <FarmerCard
                key={farmer.id}
                farmer={farmer}
                onSendRequest={onSendRequest}
                isBusy={isBusy}
              />
            ))}
          </>
        )}

        {discoverFarmers.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="people-outline" size={40} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>No farmers to discover</Text>
            <Text style={styles.emptyText}>
              New farmers will appear here as they register in your region.
            </Text>
          </View>
        )}

        <View style={styles.tipCard}>
          <View style={styles.tipRow}>
            <Ionicons name="bulb" size={16} color="#f59e0b" />
            <Text style={styles.tipTitle}>Pro Tip</Text>
          </View>
          <Text style={styles.tipText}>
            Connect with farmers who have complementary specialties so your
            community network covers more real farming experience.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f3f0ff",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd6fe",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#ddd6fe",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2937" },
  headerRight: { width: 40 },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 18 },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  statNum: { fontSize: 28, fontWeight: "800" },
  statLabel: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 12,
  },
  farmerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#c0c8d0",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    boxShadow: "0 6px 14px rgba(192, 200, 208, 0.1)",
    elevation: 3,
  },
  cardTop: { flexDirection: "row", gap: 12 },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  farmerInfo: { flex: 1 },
  farmerName: { fontSize: 16, fontWeight: "800", color: "#1f2937", marginBottom: 5 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
  detailText: { fontSize: 13, color: "#64748b" },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    flexWrap: "wrap",
    gap: 8,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6d28d9",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    gap: 6,
  },
  connectBtnDisabled: {
    opacity: 0.6,
  },
  connectBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#1f2937", marginBottom: 8 },
  emptyText: { fontSize: 14, lineHeight: 20, color: "#64748b", textAlign: "center" },
  tipCard: {
    backgroundColor: "#fffbeb",
    borderRadius: 20,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  tipTitle: { fontSize: 13, fontWeight: "800", color: "#92400e" },
  tipText: { fontSize: 13, lineHeight: 19, color: "#78350f" },
});
