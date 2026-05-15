import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import VoiceAssistant from "../../../components/VoiceAssistant";

import {
  analyticsApi,
  dashboardApi,
  getStoredUser,
  paymentsApi,
} from "../../../utils/api";

const FARMER_CORE_CARDS = [
  {
    title: "Milk Status",
    valueKey: "temp",
    formatter: (value) => `${value} C`,
    note: (data) => `${data.quality} quality and ${data.safetyIndex} safety`,
    buttonLabel: "View Status",
    route: "/(user)/(tabs)/profile",
    icon: "thermometer",
    accent: "#166534",
    tint: "#f1fbf2",
  },
  {
    title: "Payment History",
    valueKey: "payment",
    formatter: (value) => `Rs ${Number(value || 0).toLocaleString("en-IN")}`,
    note: () => "Tracked from the backend payments collection",
    buttonLabel: "View History",
    route: "/(user)/(tabs)/payment-history",
    icon: "wallet",
    accent: "#0f766e",
    tint: "#effcf9",
  },
  {
    title: "Batch Records",
    valueKey: "records",
    formatter: (value) => String(value),
    note: () => "Payment entries and linked records",
    buttonLabel: "Open Records",
    route: "/(user)/(tabs)/blockchain",
    icon: "cube",
    accent: "#2563eb",
    tint: "#eef5ff",
  },
  {
    title: "Chat Assistant",
    valueKey: "assistant",
    formatter: () => "AI",
    note: () => "Ask questions about farming",
    buttonLabel: "Open Chat",
    route: "/(user)/(tabs)/chatbot",
    icon: "chatbubble",
    accent: "#92400e",
    tint: "#fff7ed",
  },
];

const FARMER_SMART_TOOLS = [
  {
    id: "mandi-buddy",
    name: "MandiBuddy",
    tagline: "Live dairy price radar",
    desc: "Compare cooperative milk rates, hear Marathi guidance, and catch the best payout faster.",
    icon: "trending-up",
    accent: "#0288d1",
    tint: "#ebf8ff",
    route: "/(user)/mandi-buddy",
    badge: "Price Intel",
  },
  {
    id: "dudh-darpan",
    name: "DudhDarpan",
    tagline: "Heat-stress yield predictor",
    desc: "Check temperature in Celsius, get AI Marathi advice, and play it back with the existing voice service.",
    icon: "thermometer",
    accent: "#e53935",
    tint: "#fff0f0",
    route: "/(user)/dudh-darpan",
    badge: "Weather",
  },
  {
    id: "kharchi-vahi",
    name: "KharchiVahi",
    tagline: "Voice expense notebook",
    desc: "Speak an expense in Marathi, let AI understand it, and keep your farm P&L visible in one place.",
    icon: "mic",
    accent: "#2e7d32",
    tint: "#edf8ee",
    route: "/(user)/kharchi-vahi",
    badge: "Voice + AI",
  },
  {
    id: "chara-alert",
    name: "CharaAlert",
    tagline: "Fodder risk and price warning",
    desc: "See district risk, listen to Marathi advice, and plan feed purchases before prices spike.",
    icon: "warning",
    accent: "#f57c00",
    tint: "#fff7ea",
    route: "/(user)/chara-alert",
    badge: "Feed Risk",
  },
];

function formatLastUpdated(value) {
  if (!value) {
    return "Waiting for sync";
  }

  try {
    return new Date(value).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Synced";
  }
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profileName, setProfileName] = useState("Farmer");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [data, setData] = useState({
    temp: "0",
    humidity: "0",
    quality: "Pending",
    safetyIndex: "Unknown",
    payment: 0,
    records: 0,
    assistant: "AI",
  });

  useEffect(() => {
    let mounted = true;

    async function loadDashboard({ isRefresh = false } = {}) {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const user = await getStoredUser();
        if (!mounted) {
          return;
        }

        const farmerId = user?.user_id || user?.email;
        setProfileName(user?.name || "Farmer");

        if (!farmerId) {
          setError("Sign in again to load the latest farmer dashboard.");
          return;
        }

        const [dashboardResult, paymentResult, profitResult] = await Promise.allSettled([
          dashboardApi.getFarmerDashboard(farmerId),
          paymentsApi.listByFarmer(farmerId),
          analyticsApi.profit(farmerId),
        ]);

        if (!mounted) {
          return;
        }

        const nextData = {
          ...data,
          temp:
            dashboardResult.status === "fulfilled"
              ? dashboardResult.value?.temperature ?? data.temp
              : data.temp,
          humidity:
            dashboardResult.status === "fulfilled"
              ? dashboardResult.value?.humidity ?? data.humidity
              : data.humidity,
          quality:
            dashboardResult.status === "fulfilled"
              ? dashboardResult.value?.quality ?? data.quality
              : data.quality,
          safetyIndex:
            dashboardResult.status === "fulfilled"
              ? dashboardResult.value?.safety_index ?? data.safetyIndex
              : data.safetyIndex,
          payment:
            profitResult.status === "fulfilled"
              ? profitResult.value?.net_profit ?? data.payment
              : data.payment,
          records:
            paymentResult.status === "fulfilled"
              ? paymentResult.value?.payments?.length ?? data.records
              : data.records,
          assistant: "AI",
        };

        const delayedSources = [];
        if (dashboardResult.status !== "fulfilled") {
          delayedSources.push("milk status");
        }
        if (paymentResult.status !== "fulfilled") {
          delayedSources.push("payment records");
        }
        if (profitResult.status !== "fulfilled") {
          delayedSources.push("profit summary");
        }

        setData(nextData);
        setLastUpdated(new Date().toISOString());
        setError(
          delayedSources.length
            ? `Live sync is taking longer than expected for ${delayedSources.join(", ")}. Showing the latest available dashboard values.`
            : ""
        );
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError.message || "Failed to load dashboard data.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  async function refreshDashboard() {
    setRefreshing(true);
    try {
      const user = await getStoredUser();
      const farmerId = user?.user_id || user?.email;

      if (!farmerId) {
        setError("Sign in again to refresh this dashboard.");
        return;
      }

      const [dashboardResult, paymentResult, profitResult] = await Promise.allSettled([
        dashboardApi.getFarmerDashboard(farmerId),
        paymentsApi.listByFarmer(farmerId),
        analyticsApi.profit(farmerId),
      ]);

      const delayedSources = [];
      setData((current) => ({
        ...current,
        temp:
          dashboardResult.status === "fulfilled"
            ? dashboardResult.value?.temperature ?? current.temp
            : current.temp,
        humidity:
          dashboardResult.status === "fulfilled"
            ? dashboardResult.value?.humidity ?? current.humidity
            : current.humidity,
        quality:
          dashboardResult.status === "fulfilled"
            ? dashboardResult.value?.quality ?? current.quality
            : current.quality,
        safetyIndex:
          dashboardResult.status === "fulfilled"
            ? dashboardResult.value?.safety_index ?? current.safetyIndex
            : current.safetyIndex,
        payment:
          profitResult.status === "fulfilled"
            ? profitResult.value?.net_profit ?? current.payment
            : current.payment,
        records:
          paymentResult.status === "fulfilled"
            ? paymentResult.value?.payments?.length ?? current.records
            : current.records,
      }));

      if (dashboardResult.status !== "fulfilled") {
        delayedSources.push("milk status");
      }
      if (paymentResult.status !== "fulfilled") {
        delayedSources.push("payment records");
      }
      if (profitResult.status !== "fulfilled") {
        delayedSources.push("profit summary");
      }

      setLastUpdated(new Date().toISOString());
      setError(
        delayedSources.length
          ? `Live sync is taking longer than expected for ${delayedSources.join(", ")}. Showing the latest available dashboard values.`
          : ""
      );
    } catch (fetchError) {
      setError(fetchError.message || "Failed to refresh dashboard data.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(12, Math.round(insets.top * 0.15) + 10) },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refreshDashboard}
          tintColor="#ffffff"
        />
      }
    >
      <LinearGradient
        colors={["#0f5f43", "#188463", "#2e7d32"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.userBadge}>
            <Ionicons name="leaf" size={15} color="#ffffff" />
            <Text style={styles.userBadgeText}>Farmer Dashboard</Text>
          </View>
          <View style={styles.syncBadge}>
            {loading ? (
              <ActivityIndicator size="small" color="#14532d" />
            ) : (
              <>
                <Ionicons name="pulse" size={13} color="#14532d" />
                <Text style={styles.syncBadgeText}>{formatLastUpdated(lastUpdated)}</Text>
              </>
            )}
          </View>
        </View>

        <Text style={styles.title}>Hello, {profileName}</Text>
        <Text style={styles.subtitle}>
          Core records stay here, and your AI farmer tools now open faster with cleaner mobile spacing and safer live sync behavior.
        </Text>

        {error ? (
          <View style={styles.noticeCard}>
            <Ionicons name="cloud-offline-outline" size={18} color="#78350f" />
            <Text style={styles.noticeText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.heroStatsGrid}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Safety</Text>
            <Text style={styles.heroStatValue}>{data.safetyIndex}</Text>
            <Text style={styles.heroStatMeta}>{data.quality}</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Temperature</Text>
            <Text style={styles.heroStatValue}>{data.temp} C</Text>
            <Text style={styles.heroStatMeta}>Humidity {data.humidity}</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Net Profit</Text>
            <Text style={styles.heroStatValue}>
              Rs {Number(data.payment || 0).toLocaleString("en-IN")}
            </Text>
            <Text style={styles.heroStatMeta}>Live backend snapshot</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Daily essentials</Text>
        <Text style={styles.sectionSubtitle}>
          Open the records you use most without waiting for the whole page to be perfect.
        </Text>
      </View>

      {FARMER_CORE_CARDS.map((card) => (
        <View key={card.title} style={[styles.card, { backgroundColor: card.tint }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: `${card.accent}22` }]}>
              <Ionicons name={card.icon} size={20} color={card.accent} />
            </View>

            <View style={styles.cardTextBlock}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardNote}>{card.note(data)}</Text>
            </View>

            <Text style={[styles.cardValue, { color: card.accent }]}>
              {card.formatter(data[card.valueKey])}
            </Text>
          </View>

          <TouchableOpacity style={styles.linkRow} onPress={() => router.push(card.route)}>
            <Text style={[styles.actionButtonText, { color: card.accent }]}>
              {card.buttonLabel}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={card.accent} />
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.featuresShell}>
        <View style={styles.featuresHeader}>
          <View style={styles.featuresBadge}>
            <Ionicons name="sparkles" size={13} color="#ffffff" />
            <Text style={styles.featuresBadgeText}>Farmer Smart Tools</Text>
          </View>
          <Text style={styles.featuresTitle}>AI-powered farmer tools</Text>
          <Text style={styles.featuresSubtitle}>
            MandiBuddy, DudhDarpan, KharchiVahi, and CharaAlert are tuned for mobile use and now handle slower live calls more gracefully.
          </Text>
        </View>

        {FARMER_SMART_TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            activeOpacity={0.9}
            onPress={() => router.push(tool.route)}
            style={[
              styles.featureCard,
              { backgroundColor: tool.tint, borderColor: `${tool.accent}26` },
            ]}
          >
            <View style={styles.featureTop}>
              <View style={[styles.featureIconWrap, { backgroundColor: tool.accent }]}>
                <Ionicons name={tool.icon} size={20} color="#ffffff" />
              </View>

              <View style={styles.featureMid}>
                <View style={styles.featureNameRow}>
                  <Text style={[styles.featureName, { color: tool.accent }]}>{tool.name}</Text>
                  <View
                    style={[
                      styles.featureBadge,
                      { backgroundColor: `${tool.accent}18`, borderColor: `${tool.accent}33` },
                    ]}
                  >
                    <Text style={[styles.featureBadgeText, { color: tool.accent }]}>
                      {tool.badge}
                    </Text>
                  </View>
                </View>
                <Text style={styles.featureTagline}>{tool.tagline}</Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={tool.accent} />
            </View>

            <Text style={styles.featureDesc}>{tool.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>

    {/* ── Floating DairyMitra Voice FAB ── */}
    <TouchableOpacity
      style={styles.fab}
      activeOpacity={0.88}
      onPress={() => setVoiceOpen(true)}
    >
      <LinearGradient
        colors={["#166534", "#15803d"]}
        style={styles.fabGradient}
      >
        <Ionicons name="mic" size={24} color="#fff" />
      </LinearGradient>
    </TouchableOpacity>

    <VoiceAssistant
      visible={voiceOpen}
      onClose={() => setVoiceOpen(false)}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#eef4f1" },
  content: { paddingHorizontal: 16, paddingBottom: 30 },
  heroCard: {
    borderRadius: 30,
    padding: 20,
    shadowColor: "#0f5f43",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 7,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  userBadgeText: { color: "#ffffff", marginLeft: 6, fontWeight: "800" },
  syncBadge: {
    minHeight: 34,
    minWidth: 92,
    borderRadius: 999,
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  syncBadgeText: { color: "#14532d", fontSize: 12, fontWeight: "800", marginLeft: 6 },
  title: { marginTop: 20, fontSize: 28, fontWeight: "900", color: "#ffffff" },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "rgba(255,255,255,0.88)",
    lineHeight: 21,
  },
  noticeCard: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fef3c7",
    borderRadius: 18,
    padding: 14,
  },
  noticeText: { flex: 1, marginLeft: 10, color: "#78350f", lineHeight: 19, fontSize: 12 },
  heroStatsGrid: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  heroStatCard: {
    width: "48.5%",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  heroStatLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  heroStatValue: { marginTop: 8, color: "#ffffff", fontSize: 18, fontWeight: "900" },
  heroStatMeta: { marginTop: 4, color: "rgba(255,255,255,0.78)", fontSize: 12 },
  sectionHeader: { marginTop: 24, marginBottom: 8 },
  sectionTitle: { fontSize: 22, fontWeight: "900", color: "#102a1e" },
  sectionSubtitle: { marginTop: 4, fontSize: 13, color: "#5f6f66", lineHeight: 19 },
  card: {
    padding: 16,
    borderRadius: 22,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.04)",
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTextBlock: { flex: 1, marginLeft: 12, marginRight: 10 },
  cardTitle: { fontWeight: "800", fontSize: 16, color: "#102a1e" },
  cardNote: { color: "#5f6f66", fontSize: 12, marginTop: 3, lineHeight: 17 },
  cardValue: { fontSize: 18, fontWeight: "900" },
  linkRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  actionButtonText: { fontWeight: "800", marginRight: 8 },
  featuresShell: {
    marginTop: 26,
    padding: 16,
    borderRadius: 30,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  featuresHeader: { marginBottom: 8 },
  featuresBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#0f766e",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  featuresBadgeText: { color: "#ffffff", fontSize: 11, fontWeight: "800", marginLeft: 6 },
  featuresTitle: { marginTop: 10, fontSize: 22, fontWeight: "900", color: "#102a1e" },
  featuresSubtitle: { marginTop: 5, fontSize: 13, color: "#64748b", lineHeight: 20 },
  featureCard: {
    marginTop: 12,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
  },
  featureTop: { flexDirection: "row", alignItems: "center" },
  featureIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  featureMid: { flex: 1, marginLeft: 11, marginRight: 10 },
  featureNameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  featureName: { fontSize: 17, fontWeight: "900" },
  featureBadge: {
    marginLeft: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  featureBadgeText: { fontSize: 10, fontWeight: "800" },
  featureTagline: { fontSize: 12, color: "#475569", marginTop: 3, fontWeight: "700" },
  featureDesc: { marginTop: 9, fontSize: 13, color: "#334155", lineHeight: 20 },
  // ── Voice FAB ──────────────────────────────────────────────────────────────
  fab: {
    position: "absolute",
    bottom: 28,
    right: 22,
    borderRadius: 32,
    shadowColor: "#166534",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 12,
  },
  fabGradient: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
  },
});
