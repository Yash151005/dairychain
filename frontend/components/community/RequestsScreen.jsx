import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

function BackHeader({ onBack, title }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={20} color="#2e7d32" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerRight} />
    </View>
  );
}

function RequestCard({ farmer, onAccept, onDecline, isBusy }) {
  return (
    <View style={styles.requestCard}>
      <View style={styles.requestTop}>
        <View style={styles.avatarWrap}>
          <Ionicons name="person" size={22} color="#ef6c00" />
        </View>
        <View style={styles.requestInfo}>
          <Text style={styles.requestName}>{farmer.name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color="#64748b" />
            <Text style={styles.requestVillage}>{farmer.village}</Text>
          </View>
          <View style={styles.specialtyRow}>
            <Ionicons name="leaf-outline" size={13} color="#2e7d32" />
            <Text style={styles.requestSpecialty}>{farmer.specialty}</Text>
          </View>
        </View>
      </View>

      <View style={styles.timePill}>
        <Ionicons name="time-outline" size={13} color="#ef6c00" />
        <Text style={styles.timeText}>{farmer.lastSeen}</Text>
      </View>

      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.acceptBtn, isBusy && styles.actionBtnDisabled]}
          activeOpacity={0.85}
          onPress={() => onAccept(farmer.id)}
          disabled={isBusy}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.acceptBtnText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.declineBtn, isBusy && styles.actionBtnDisabled]}
          activeOpacity={0.85}
          onPress={() => onDecline(farmer.id)}
          disabled={isBusy}
        >
          <Ionicons name="close-circle-outline" size={18} color="#64748b" />
          <Text style={styles.declineBtnText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function RequestsScreen({
  incomingRequests,
  onAccept,
  onDecline,
  onBack,
  isBusy = false,
}) {
  return (
    <View style={styles.container}>
      <BackHeader onBack={onBack} title="Connection Requests" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: "#fff3e7" }]}>
            <Ionicons name="mail-open" size={22} color="#ef6c00" />
            <Text style={[styles.statNum, { color: "#ef6c00" }]}>{incomingRequests.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#edf8ee" }]}>
            <Ionicons name="checkmark-done" size={22} color="#2e7d32" />
            <Text style={[styles.statNum, { color: "#2e7d32" }]}>0</Text>
            <Text style={styles.statLabel}>Accepted Today</Text>
          </View>
        </View>

        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={18} color="#1565c0" />
          <Text style={styles.infoText}>
            Accepting a request lets that farmer send direct messages to you. You can
            decide request by request.
          </Text>
        </View>

        {incomingRequests.length > 0 ? (
          <>
            <Text style={styles.listTitle}>Pending Requests - {incomingRequests.length}</Text>
            {incomingRequests.map((farmer) => (
              <RequestCard
                key={farmer.id}
                farmer={farmer}
                onAccept={onAccept}
                onDecline={onDecline}
                isBusy={isBusy}
              />
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="mail-open-outline" size={40} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>No pending requests</Text>
            <Text style={styles.emptyText}>
              When other farmers send you a connection request, it will appear here.
            </Text>
          </View>
        )}
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
    backgroundColor: "#eef7ee",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#d4ebd4",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#d4ebd4",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2937" },
  headerRight: { width: 40 },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  statNum: { fontSize: 28, fontWeight: "800" },
  statLabel: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#eaf6fd",
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 18,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19, color: "#0c4a8d" },
  listTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 12,
  },
  requestCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#d0d8d0",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    boxShadow: "0 6px 14px rgba(208, 216, 208, 0.1)",
    elevation: 3,
  },
  requestTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#fff3e7",
    alignItems: "center",
    justifyContent: "center",
  },
  requestInfo: { flex: 1 },
  requestName: { fontSize: 16, fontWeight: "800", color: "#1f2937", marginBottom: 4 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 },
  requestVillage: { fontSize: 13, color: "#64748b" },
  specialtyRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  requestSpecialty: { fontSize: 13, color: "#2e7d32" },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff3e7",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 12,
  },
  timeText: { fontSize: 12, fontWeight: "700", color: "#ef6c00" },
  requestActions: {
    flexDirection: "row",
    marginTop: 14,
    gap: 10,
  },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2e7d32",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    gap: 6,
    flex: 1,
    justifyContent: "center",
  },
  acceptBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  declineBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    gap: 6,
    flex: 1,
    justifyContent: "center",
  },
  declineBtnText: { color: "#64748b", fontSize: 14, fontWeight: "800" },
  actionBtnDisabled: {
    opacity: 0.6,
  },
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
});
