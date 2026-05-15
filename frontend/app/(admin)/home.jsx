import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { dashboardApi } from "../../utils/api";

const DASHBOARD_CARDS = [
  {
    title: "Total Farmers",
    note: "Active supplier network",
    valueKey: "farmers",
    formatter: (value) => `${value}+`,
    route: "/(admin)/(tabs)/farmers",
    buttonLabel: "View Farmers",
    icon: "people",
    accent: "#2e7d32",
    tint: "#edf9ef",
  },
  {
    title: "Milk Batches",
    note: "Collection records in database",
    valueKey: "batches",
    formatter: (value) => String(value),
    route: "/(admin)/(tabs)/analytics",
    buttonLabel: "View Analytics",
    icon: "water",
    accent: "#0288d1",
    tint: "#eef7ff",
  },
  {
    title: "Purity Rate",
    note: "Pure batches share",
    valueKey: "purityRate",
    formatter: (value) => `${value}%`,
    route: "/(admin)/(tabs)/analytics",
    buttonLabel: "Open Reports",
    icon: "checkmark-done-circle",
    accent: "#1976d2",
    tint: "#eef5ff",
  },
  {
    title: "Alerts",
    note: "Temperature and quality issues",
    valueKey: "alerts",
    formatter: (value) => String(value),
    route: "/(admin)/(tabs)/analytics",
    buttonLabel: "Review Alerts",
    icon: "warning",
    accent: "#ef6c00",
    tint: "#fff5ea",
  },
];

const ADMIN_SMART_TOOLS = [
  {
    id: "dairy-score",
    name: "DairyScore",
    tagline: "AI credit score and in-app payment flow",
    desc: "Select a farmer by name, review their KCC-ready credit profile, and open the payment link inside the app.",
    icon: "shield-checkmark",
    accent: "#7b1fa2",
    tint: "#f3e5f5",
    route: "/(admin)/dairy-score",
    badge: "Finance",
  },
  {
    id: "notify-sim",
    name: "NotifyCenter",
    tagline: "Admin broadcast and alert simulator",
    desc: "Send focused price, weather, fodder, and payment updates to the right farmer groups.",
    icon: "notifications",
    accent: "#00796b",
    tint: "#e0f2f1",
    route: "/(admin)/notify-sim",
    badge: "Admin Only",
  },
];

export default function AdminHome() {
  const router = useRouter();
  const [data, setData] = useState({
    farmers: 0,
    batches: 0,
    alerts: 0,
    purityRate: 0,
    recentBatches: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setError("");
        const json = await dashboardApi.getAdminDashboard();

        if (!mounted) {
          return;
        }

        setData({
          farmers: json?.dashboard?.total_farmers || 0,
          batches: json?.dashboard?.total_batches || 0,
          alerts: json?.dashboard?.active_alerts || 0,
          purityRate: json?.dashboard?.purity_rate || 0,
          recentBatches: json?.dashboard?.recent_batches || [],
        });
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError.message || "Failed to load admin dashboard.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Backend data not loaded</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.heroCard}>
        <View style={styles.heroBadge}>
          <Ionicons name="shield-checkmark" size={16} color="#ffffff" />
          <Text style={styles.heroBadgeText}>Admin Dashboard</Text>
        </View>

        <Text style={styles.heroTitle}>Monitor dairy operations with clean role-based tools.</Text>
        <Text style={styles.heroSubtitle}>
          Admin now keeps finance and notification controls here, while farmer advisory tools live on the farmer side.
        </Text>

        <View style={styles.quickRow}>
          <View style={styles.quickPill}>
            <Ionicons name="people" size={15} color="#2e7d32" />
            <Text style={styles.quickText}>
              {loading ? "Loading..." : `${data.farmers}+ farmers`}
            </Text>
          </View>
          <View style={styles.quickPill}>
            <Ionicons name="analytics" size={15} color="#0288d1" />
            <Text style={styles.quickText}>
              {loading ? "Loading..." : `${data.batches} batches`}
            </Text>
          </View>
        </View>
      </View>

      {DASHBOARD_CARDS.map((card) => (
        <View key={card.title} style={[styles.card, { backgroundColor: card.tint }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: `${card.accent}22` }]}>
              <Ionicons name={card.icon} size={20} color={card.accent} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardNote}>{card.note}</Text>
            </View>
            <Text style={[styles.cardValue, { color: card.accent }]}>
              {card.formatter(data[card.valueKey])}
            </Text>
          </View>

          <TouchableOpacity style={styles.linkRow} onPress={() => router.push(card.route)}>
            <Text style={styles.linkText}>{card.buttonLabel}</Text>
            <Ionicons name="arrow-forward" size={16} color="#1f2937" />
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.sectionHeader}>
        <View style={styles.sectionBadge}>
          <Ionicons name="sparkles" size={13} color="#ffffff" />
          <Text style={styles.sectionBadgeText}>Admin Smart Tools</Text>
        </View>
        <Text style={styles.sectionTitle}>Focused admin access</Text>
        <Text style={styles.sectionSubtitle}>
          DairyScore and NotifyCenter stay with admin. Farmer advisory products move to the farmer dashboard.
        </Text>
      </View>

      {ADMIN_SMART_TOOLS.map((tool) => (
        <TouchableOpacity
          key={tool.id}
          activeOpacity={0.88}
          onPress={() => router.push(tool.route)}
          style={[styles.featureCard, { backgroundColor: tool.tint, borderLeftColor: tool.accent }]}
        >
          <View style={styles.featureTop}>
            <View style={[styles.featureIcon, { backgroundColor: tool.accent }]}>
              <Ionicons name={tool.icon} size={20} color="#ffffff" />
            </View>
            <View style={styles.featureText}>
              <View style={styles.featureTitleRow}>
                <Text style={[styles.featureName, { color: tool.accent }]}>{tool.name}</Text>
                <View style={[styles.featureBadge, { backgroundColor: `${tool.accent}22` }]}>
                  <Text style={[styles.featureBadgeText, { color: tool.accent }]}>{tool.badge}</Text>
                </View>
              </View>
              <Text style={styles.featureTagline}>{tool.tagline}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tool.accent} />
          </View>
          <Text style={styles.featureDesc}>{tool.desc}</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.recentCard}>
        <Text style={styles.recentTitle}>Recent Batches</Text>
        {data.recentBatches.length ? (
          data.recentBatches.map((batch) => (
            <View key={batch._id || batch.batch_id} style={styles.recentRow}>
              <View>
                <Text style={styles.recentBatchId}>{batch.batch_id || batch._id}</Text>
                <Text style={styles.recentMeta}>
                  {batch.farmer_name || batch.farmer_id || "Unknown farmer"}
                </Text>
              </View>
              <View style={styles.recentBadge}>
                <Text style={styles.recentBadgeText}>
                  {batch.quality_status || batch.quality || batch.safety_index || "Pending"}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.recentEmpty}>No recent batches were found in the database.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f5" },
  content: { padding: 15, paddingBottom: 28 },
  errorCard: { backgroundColor: "#fff4e6", borderRadius: 20, padding: 14, marginBottom: 14 },
  errorTitle: { fontSize: 16, fontWeight: "800", color: "#9a3412" },
  errorText: { marginTop: 4, color: "#b45309", lineHeight: 20 },
  heroCard: { padding: 20, marginBottom: 14, borderRadius: 24, backgroundColor: "#eaf7ea" },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#2e7d32",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  heroBadgeText: { color: "#ffffff", marginLeft: 6, fontWeight: "700" },
  heroTitle: { marginTop: 16, fontSize: 26, fontWeight: "900", color: "#1f2937" },
  heroSubtitle: { marginTop: 8, fontSize: 14, color: "#4b5563", lineHeight: 21 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 14 },
  quickPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    marginTop: 8,
  },
  quickText: { marginLeft: 6, fontWeight: "700", color: "#1f2937" },
  card: { marginTop: 12, borderRadius: 22, padding: 16 },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  iconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  cardText: { flex: 1, marginLeft: 12, marginRight: 12 },
  cardTitle: { fontSize: 17, fontWeight: "800", color: "#1f2937" },
  cardNote: { fontSize: 12, color: "#64748b", marginTop: 2 },
  cardValue: { fontSize: 22, fontWeight: "800" },
  linkRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  linkText: { fontWeight: "800", color: "#1f2937", marginRight: 8 },
  sectionHeader: { marginTop: 22, marginBottom: 8 },
  sectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#0f766e",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sectionBadgeText: { color: "#ffffff", fontSize: 11, fontWeight: "800", marginLeft: 6 },
  sectionTitle: { marginTop: 8, fontSize: 22, fontWeight: "900", color: "#1f2937" },
  sectionSubtitle: { marginTop: 4, fontSize: 13, color: "#64748b", lineHeight: 19 },
  featureCard: { marginTop: 10, borderRadius: 20, padding: 14, borderLeftWidth: 4 },
  featureTop: { flexDirection: "row", alignItems: "center" },
  featureIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  featureText: { flex: 1, marginLeft: 10, marginRight: 10 },
  featureTitleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  featureName: { fontSize: 17, fontWeight: "900" },
  featureBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 8 },
  featureBadgeText: { fontSize: 10, fontWeight: "800" },
  featureTagline: { marginTop: 2, fontSize: 12, color: "#555", fontWeight: "700" },
  featureDesc: { marginTop: 8, fontSize: 13, color: "#374151", lineHeight: 19 },
  recentCard: { marginTop: 14, borderRadius: 22, padding: 16, backgroundColor: "#ffffff" },
  recentTitle: { fontSize: 18, fontWeight: "800", color: "#1f2937", marginBottom: 12 },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  recentBatchId: { fontSize: 15, fontWeight: "800", color: "#1f2937" },
  recentMeta: { marginTop: 3, fontSize: 12, color: "#64748b" },
  recentBadge: { backgroundColor: "#edf9ef", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  recentBadgeText: { fontSize: 12, fontWeight: "800", color: "#2e7d32" },
  recentEmpty: { color: "#64748b" },
});
