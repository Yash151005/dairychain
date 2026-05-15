/**
 * NotifyCenter — Admin Notification Simulator
 * Lets the admin send simulated push alerts to all farmers.
 * Notification types: price_alert, weather_alert, fodder_alert, credit_alert, general
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hackathonApi } from "../../utils/api";

const NOTIF_TYPES = [
  {
    key:     "price_alert",
    label:   "Price Alert",
    icon:    "trending-up",
    color:   "#0288d1",
    tint:    "#e3f2fd",
    sample_title:   "Milk Rate Update",
    sample_message: "Katraj Dairy hiked cow milk rate to ₹42/litre. Check MandiBuddy for details.",
  },
  {
    key:     "weather_alert",
    label:   "Weather Alert",
    icon:    "thermometer",
    color:   "#e53935",
    tint:    "#fce4ec",
    sample_title:   "Heat Stress Warning",
    sample_message: "THI forecast: 84 (Severe). Yield may drop 30% tomorrow. Keep cattle in shade.",
  },
  {
    key:     "fodder_alert",
    label:   "Fodder Alert",
    icon:    "warning",
    color:   "#f57c00",
    tint:    "#fff3e0",
    sample_title:   "Fodder Scarcity Alert",
    sample_message: "Pune district: concentrate feed at ₹21/kg (+12%). Stock silage this week.",
  },
  {
    key:     "credit_alert",
    label:   "Credit/Payment",
    icon:    "card",
    color:   "#7b1fa2",
    tint:    "#f3e5f5",
    sample_title:   "Payment Released",
    sample_message: "₹2,800 milk payment credited to your account. DairyScore updated to 742.",
  },
  {
    key:     "general",
    label:   "General",
    icon:    "notifications",
    color:   "#00796b",
    tint:    "#e0f2f1",
    sample_title:   "SmartShetakari Update",
    sample_message: "New feature: KharchiVahi voice expense tracker is now live. Try it today!",
  },
];

const FARMER_COUNTS = [
  { label: "All Farmers",    count: 47 },
  { label: "Pune Region",    count: 18 },
  { label: "Nashik Region",  count: 12 },
  { label: "Active (7 days)",count: 34 },
  { label: "Test Farmer",    count: 1  },
];

export default function NotifySim() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedType, setSelectedType] = useState(NOTIF_TYPES[0]);
  const [selectedTarget, setSelectedTarget] = useState(FARMER_COUNTS[0]);
  const [title,   setTitle]   = useState(NOTIF_TYPES[0].sample_title);
  const [message, setMessage] = useState(NOTIF_TYPES[0].sample_message);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => { loadHistory(); }, []);

  async function loadHistory() {
    setHistLoading(true);
    try {
      const res = await hackathonApi.listNotifications();
      setHistory(res.notifications || []);
    } catch (_) {}
    finally { setHistLoading(false); }
  }

  function selectType(t) {
    setSelectedType(t);
    setTitle(t.sample_title);
    setMessage(t.sample_message);
  }

  async function sendNotification() {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    setLastResult(null);
    try {
      const res = await hackathonApi.sendNotification({
        type:            selectedType.key,
        title:           title.trim(),
        message:         message.trim(),
        icon:            selectedType.icon,
        target:          selectedTarget.label,
        recipient_count: selectedTarget.count,
      });
      setLastResult(res);
      await loadHistory();
    } catch (e) {
      setLastResult({ error: e.message });
    } finally {
      setSending(false);
    }
  }

  const typeColor = selectedType.color;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingTop: insets.top + 10 }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#00796b" />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.title}>NotifyCenter</Text>
          <Text style={s.subtitle}>Admin Notification Simulator</Text>
        </View>
        <View style={s.adminBadge}>
          <Ionicons name="shield-checkmark" size={14} color="#fff" />
          <Text style={s.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      {/* Notification type selector */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>Notification Type</Text>
        <View style={s.typeGrid}>
          {NOTIF_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => selectType(t)}
              style={[
                s.typeCard,
                { backgroundColor: t.tint, borderColor: t.color },
                selectedType.key === t.key && s.typeCardSelected,
                selectedType.key === t.key && { borderColor: t.color, borderWidth: 2.5 },
              ]}
            >
              <View style={[s.typeIcon, { backgroundColor: t.color }]}>
                <Ionicons name={t.icon} size={18} color="#fff" />
              </View>
              <Text style={[s.typeLabel, { color: t.color }]}>{t.label}</Text>
              {selectedType.key === t.key && (
                <Ionicons name="checkmark-circle" size={14} color={t.color} style={s.typeCheck} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Target audience */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>Target Audience</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.targetRow}>
            {FARMER_COUNTS.map((fc) => (
              <TouchableOpacity
                key={fc.label}
                onPress={() => setSelectedTarget(fc)}
                style={[
                  s.targetChip,
                  selectedTarget.label === fc.label && {
                    backgroundColor: typeColor, borderColor: typeColor,
                  },
                ]}
              >
                <Text style={[
                  s.targetChipLabel,
                  selectedTarget.label === fc.label && { color: "#fff" },
                ]}>
                  {fc.label}
                </Text>
                <View style={[
                  s.targetChipCount,
                  selectedTarget.label === fc.label && { backgroundColor: "rgba(255,255,255,0.3)" },
                ]}>
                  <Text style={[
                    s.targetChipCountText,
                    selectedTarget.label === fc.label && { color: "#fff" },
                  ]}>
                    {fc.count}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Compose */}
      <View style={[s.card, { borderTopWidth: 4, borderTopColor: typeColor }]}>
        <View style={s.composeHeader}>
          <View style={[s.composeIcon, { backgroundColor: typeColor }]}>
            <Ionicons name={selectedType.icon} size={20} color="#fff" />
          </View>
          <Text style={[s.composeTitle, { color: typeColor }]}>Compose Notification</Text>
        </View>

        <Text style={s.inputLabel}>Title</Text>
        <TextInput
          style={[s.input, { borderColor: typeColor + "55" }]}
          value={title}
          onChangeText={setTitle}
          placeholder="Notification title"
          placeholderTextColor="#94a3b8"
        />

        <Text style={s.inputLabel}>Message</Text>
        <TextInput
          style={[s.textArea, { borderColor: typeColor + "55" }]}
          value={message}
          onChangeText={setMessage}
          placeholder="Write the notification message here..."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={4}
        />

        {/* Preview */}
        <View style={[s.preview, { backgroundColor: selectedType.tint, borderColor: typeColor + "44" }]}>
          <View style={s.previewTop}>
            <View style={[s.previewIcon, { backgroundColor: typeColor }]}>
              <Ionicons name={selectedType.icon} size={14} color="#fff" />
            </View>
            <Text style={s.previewApp}>SmartShetakari</Text>
            <Text style={s.previewTime}>now</Text>
          </View>
          <Text style={[s.previewTitle, { color: typeColor }]} numberOfLines={1}>
            {title || "Notification Title"}
          </Text>
          <Text style={s.previewMsg} numberOfLines={2}>
            {message || "Notification message..."}
          </Text>
          <Text style={s.previewTarget}>
            → {selectedTarget.label} ({selectedTarget.count} farmers)
          </Text>
        </View>

        <TouchableOpacity
          style={[s.sendBtn, { backgroundColor: typeColor }]}
          onPress={sendNotification}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={s.sendBtnText}>
                Send to {selectedTarget.count} Farmers
              </Text>
            </>
          )}
        </TouchableOpacity>

        {lastResult && !lastResult.error && (
          <View style={s.successBox}>
            <Ionicons name="checkmark-circle" size={20} color="#2e7d32" />
            <View style={{ flex: 1 }}>
              <Text style={s.successTitle}>Notification Sent!</Text>
              <Text style={s.successText}>
                Delivered to {lastResult.recipients_sent} farmers at{" "}
                {lastResult.notification?.sent_at?.slice(11, 19)} UTC
              </Text>
            </View>
          </View>
        )}
        {lastResult?.error && (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#b91c1c" />
            <Text style={s.errorText}>{lastResult.error}</Text>
          </View>
        )}
      </View>

      {/* Sent history */}
      <View style={s.card}>
        <View style={s.histHeader}>
          <Text style={s.histTitle}>Sent Notifications</Text>
          <TouchableOpacity onPress={loadHistory} style={s.refreshBtn}>
            <Ionicons name="refresh" size={16} color="#00796b" />
          </TouchableOpacity>
        </View>

        {histLoading ? (
          <ActivityIndicator color="#00796b" style={{ marginVertical: 20 }} />
        ) : history.length === 0 ? (
          <Text style={s.histEmpty}>No notifications sent yet.</Text>
        ) : (
          history.slice(0, 10).map((n, i) => {
            const t = NOTIF_TYPES.find((x) => x.key === n.type) || NOTIF_TYPES[4];
            return (
              <View key={n._id || i} style={s.histRow}>
                <View style={[s.histIcon, { backgroundColor: t.color + "22" }]}>
                  <Ionicons name={t.icon} size={16} color={t.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.histRowTitle}>{n.title}</Text>
                  <Text style={s.histRowMsg} numberOfLines={1}>{n.message}</Text>
                  <Text style={s.histRowMeta}>
                    {n.target} • {n.sent_at?.slice(0, 10) || "Today"}
                  </Text>
                </View>
                <View style={[s.simBadge, { backgroundColor: t.tint }]}>
                  <Text style={[s.simBadgeText, { color: t.color }]}>Simulated</Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: "#e8f5f0" },
  content: { padding: 16, paddingBottom: 40 },

  header: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 10 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: "#e0f2f1",
    alignItems: "center", justifyContent: "center",
  },
  headerText: { flex: 1 },
  title:    { fontSize: 24, fontWeight: "900", color: "#004d40" },
  subtitle: { fontSize: 13, color: "#546e7a" },
  adminBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#00796b", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
  },
  adminBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },

  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 16, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#546e7a", marginBottom: 12 },

  // Type grid
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14,
    borderWidth: 1.5, minWidth: "46%", flex: 1,
  },
  typeCardSelected: {},
  typeIcon:  { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  typeLabel: { flex: 1, fontSize: 13, fontWeight: "800" },
  typeCheck: { marginLeft: "auto" },

  // Target
  targetRow: { flexDirection: "row", gap: 8 },
  targetChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "#f1f5f9", borderWidth: 1.5, borderColor: "#e2e8f0",
  },
  targetChipLabel: { fontSize: 12, fontWeight: "700", color: "#374151" },
  targetChipCount: {
    backgroundColor: "#e2e8f0", borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  targetChipCountText: { fontSize: 11, fontWeight: "900", color: "#374151" },

  // Compose
  composeHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  composeIcon:   { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  composeTitle:  { fontSize: 16, fontWeight: "900" },
  inputLabel:    { fontSize: 12, fontWeight: "700", color: "#546e7a", marginBottom: 6 },
  input: {
    backgroundColor: "#f8fafc", borderRadius: 12, padding: 12, fontSize: 14,
    fontWeight: "700", color: "#1e293b", marginBottom: 12,
    borderWidth: 1.5,
  },
  textArea: {
    backgroundColor: "#f8fafc", borderRadius: 12, padding: 12, fontSize: 14,
    color: "#1e293b", minHeight: 80, marginBottom: 14, textAlignVertical: "top",
    borderWidth: 1.5,
  },

  // Preview
  preview: {
    borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1,
  },
  previewTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  previewIcon:{ width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  previewApp: { flex: 1, fontSize: 11, fontWeight: "800", color: "#64748b" },
  previewTime:{ fontSize: 11, color: "#94a3b8" },
  previewTitle:{ fontSize: 15, fontWeight: "900", marginBottom: 3 },
  previewMsg:  { fontSize: 13, color: "#374151", lineHeight: 18, marginBottom: 6 },
  previewTarget:{ fontSize: 11, color: "#64748b", fontWeight: "600" },

  sendBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderRadius: 14, padding: 15, gap: 8,
  },
  sendBtnText: { color: "#fff", fontSize: 16, fontWeight: "900" },

  successBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#e8f5e9", borderRadius: 14, padding: 12, marginTop: 10,
  },
  successTitle: { fontSize: 14, fontWeight: "800", color: "#1b5e20" },
  successText:  { fontSize: 12, color: "#2e7d32" },

  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fee2e2", borderRadius: 12, padding: 10, marginTop: 10,
  },
  errorText: { flex: 1, fontSize: 12, color: "#b91c1c" },

  // History
  histHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  histTitle:  { fontSize: 16, fontWeight: "900", color: "#1e293b" },
  refreshBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#e0f2f1", alignItems: "center", justifyContent: "center" },
  histEmpty:  { color: "#64748b", fontSize: 13, textAlign: "center", paddingVertical: 16 },
  histRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  histIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  histRowTitle:  { fontSize: 13, fontWeight: "800", color: "#1e293b" },
  histRowMsg:    { fontSize: 12, color: "#64748b", marginTop: 1 },
  histRowMeta:   { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  simBadge:      { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  simBadgeText:  { fontSize: 10, fontWeight: "800" },
});
