import { Ionicons } from "@expo/vector-icons";
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

import { speakText, stopSpeaking } from "../../components/tts-service";
import { hackathonApi } from "../../utils/api";

const REGIONS = ["Pune", "Nashik", "Kolhapur", "Aurangabad", "Solapur", "Marathwada"];

function formatUpdatedAt(value) {
  if (!value) return "Ready";
  try {
    return new Date(value).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Updated";
  }
}

function RiskBadge({ label, color }) {
  const icon =
    label === "High" ? "warning" : label === "Medium" ? "alert-circle" : "checkmark-circle";
  return (
    <View style={[riskBadge.wrap, { backgroundColor: `${color}22`, borderColor: color }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[riskBadge.text, { color }]}>{label}</Text>
    </View>
  );
}

const riskBadge = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: { fontSize: 11, fontWeight: "800", marginLeft: 4 },
});

export default function CharaAlert() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [region, setRegion] = useState("Pune");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    void fetchAlert();
    return () => {
      void stopSpeaking();
    };
  }, []);

  async function fetchAlert({ isRefresh = false } = {}) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const response = await hackathonApi.charaAlert(region);
      setData(response);
      setLastUpdated(new Date().toISOString());
    } catch (requestError) {
      setError(
        data
          ? `${requestError.message || "Failed to load."} Showing the last snapshot.`
          : requestError.message || "Failed to fetch fodder alert."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function playMarathiAlert() {
    if (!data?.audio_text && !data?.marathi_alert) return;

    if (speaking) {
      await stopSpeaking();
      setSpeaking(false);
      return;
    }

    setSpeaking(true);
    await speakText(data.audio_text || data.marathi_alert, "mr", {
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  const selected = data?.selected;
  const riskColor = selected?.color || "#2e7d32";
  const costAnalysis = data?.cost_analysis;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchAlert({ isRefresh: true })}
          tintColor="#f59e0b"
        />
      }
    >
      {/* Hero */}
      <View style={styles.heroCard}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#92400e" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>CharaAlert</Text>
            <Text style={styles.subtitle}>Fodder scarcity early-warning system</Text>
          </View>
          <View style={styles.liveChip}>
            <Ionicons name="leaf" size={13} color="#92400e" />
            <Text style={styles.liveText}>{formatUpdatedAt(lastUpdated)}</Text>
          </View>
        </View>

        <Text style={styles.heroCopy}>
          District-level fodder risk index updated daily. Pull the latest forecast, check prices, and hear AI guidance in Marathi.
        </Text>

        <View style={styles.heroMetrics}>
          <View style={styles.heroMetricCard}>
            <Text style={styles.heroMetricLabel}>Selected District</Text>
            <Text style={styles.heroMetricValue}>{data?.region || region}</Text>
            <Text style={styles.heroMetricMeta}>
              {selected ? selected.risk_label + " risk" : "Waiting for data"}
            </Text>
          </View>
          <View style={styles.heroMetricCard}>
            <Text style={styles.heroMetricLabel}>Profit/Litre</Text>
            <Text style={[styles.heroMetricValue, { color: (costAnalysis?.profit_per_litre ?? 0) >= 0 ? "#2e7d32" : "#dc2626" }]}>
              {costAnalysis ? `Rs ${costAnalysis.profit_per_litre}` : "--"}
            </Text>
            <Text style={styles.heroMetricMeta}>after feed cost</Text>
          </View>
        </View>
      </View>

      {/* Region Selector */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Select District</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {REGIONS.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setRegion(item)}
                style={[styles.chip, region === item && styles.chipActive]}
              >
                <Text style={[styles.chipText, region === item && styles.chipTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={styles.fetchBtn}
          onPress={() => fetchAlert()}
          disabled={loading || refreshing}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="alert-circle" size={18} color="#fff" />
              <Text style={styles.fetchBtnText}>
                {data ? "Refresh Fodder Alert" : "Check Fodder Alert"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle" size={18} color="#b91c1c" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {data ? (
        <>
          {/* Selected district banner */}
          {selected ? (
            <View
              style={[styles.banner, { backgroundColor: `${riskColor}14`, borderColor: riskColor }]}
            >
              <View style={[styles.bannerIcon, { backgroundColor: riskColor }]}>
                <Ionicons
                  name={
                    selected.risk_label === "High"
                      ? "warning"
                      : selected.risk_label === "Medium"
                      ? "alert-circle"
                      : "checkmark-circle"
                  }
                  size={22}
                  color="#fff"
                />
              </View>
              <View style={styles.bannerText}>
                <Text style={[styles.bannerTitle, { color: riskColor }]}>
                  {selected.district} — {selected.risk_label} Risk
                </Text>
                <Text style={styles.bannerMeta}>
                  Risk index {selected.risk_index}/9 · {selected.price_trend}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Fodder prices */}
          {selected?.prices ? (
            <View style={styles.priceCard}>
              <Text style={styles.priceTitle}>Today's Fodder Prices — {selected.district}</Text>
              {[
                { label: "Concentrate Feed", value: `Rs ${selected.prices.concentrate_per_kg}/kg`, icon: "nutrition", color: "#7b1fa2" },
                { label: "Dry Fodder", value: `Rs ${selected.prices.dry_fodder_per_kg}/kg`, icon: "leaf", color: "#f59e0b" },
                { label: "Green Fodder", value: `Rs ${selected.prices.green_fodder_per_quintal}/quintal`, icon: "flower", color: "#2e7d32" },
              ].map((item) => (
                <View key={item.label} style={styles.priceRow}>
                  <View style={[styles.priceIcon, { backgroundColor: `${item.color}18` }]}>
                    <Ionicons name={item.icon} size={16} color={item.color} />
                  </View>
                  <Text style={styles.priceLabel}>{item.label}</Text>
                  <Text style={[styles.priceValue, { color: item.color }]}>{item.value}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Cost analysis */}
          {costAnalysis ? (
            <View style={styles.costRow}>
              {[
                {
                  label: "Feed Cost",
                  value: `Rs ${costAnalysis.feed_cost_per_kg}/kg`,
                  color: "#e53935",
                  icon: "cash",
                },
                {
                  label: "Production",
                  value: `Rs ${costAnalysis.production_cost_per_litre}/L`,
                  color: "#f57c00",
                  icon: "water",
                },
                {
                  label: "Profit",
                  value: `Rs ${costAnalysis.profit_per_litre}/L`,
                  color: costAnalysis.profit_per_litre >= 0 ? "#2e7d32" : "#dc2626",
                  icon: "trending-up",
                },
              ].map((item) => (
                <View key={item.label} style={styles.costCard}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                  <Text style={[styles.costValue, { color: item.color }]}>{item.value}</Text>
                  <Text style={styles.costLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* District risk overview */}
          <View style={styles.districtCard}>
            <Text style={styles.districtTitle}>Maharashtra District Risk Overview</Text>
            {(data.districts || []).map((d) => (
              <View key={d.district} style={styles.districtRow}>
                <View style={[styles.riskBar, { backgroundColor: `${d.color}22` }]}>
                  <View
                    style={[
                      styles.riskFill,
                      {
                        width: `${(d.risk_index / 9) * 100}%`,
                        backgroundColor: d.color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.districtName}>{d.district}</Text>
                <RiskBadge label={d.risk_label} color={d.color} />
              </View>
            ))}
          </View>

          {/* Marathi advisory */}
          <View style={[styles.advisoryCard, { borderLeftColor: riskColor }]}>
            <View style={styles.advisoryHeader}>
              <View style={styles.advisoryTitleWrap}>
                <Text style={styles.advisoryLabel}>AI Marathi Suchana</Text>
                <Text style={styles.advisoryHeading}>
                  {data.advisory_heading || "चार्‍याबाबत सूचना"}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.voiceBtn, { backgroundColor: riskColor }]}
                onPress={playMarathiAlert}
              >
                <Ionicons name={speaking ? "pause" : "volume-high"} size={16} color="#fff" />
                <Text style={styles.voiceBtnText}>{speaking ? "Stop" : "Play Audio"}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.advisoryText}>{data.marathi_alert}</Text>
            {(data.tips || []).map((tip, index) => (
              <View key={`${tip}-${index}`} style={styles.tipRow}>
                <View style={[styles.tipDot, { backgroundColor: riskColor }]} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sourceRow}>
            <Ionicons name="globe-outline" size={14} color="#64748b" />
            <Text style={styles.sourceText}>
              {data.serper_snippets > 0
                ? `${data.serper_snippets} live web snippets analyzed for today's forecast`
                : "Demo price index shown. Add SERPER_API_KEY for live fodder price ingestion."}
            </Text>
          </View>
        </>
      ) : (
        !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="leaf" size={54} color="#f59e0b" style={{ opacity: 0.3 }} />
            <Text style={styles.emptyTitle}>No alert loaded yet</Text>
            <Text style={styles.emptyText}>
              Pick a district and check the fodder scarcity alert to see risk levels and Marathi AI guidance.
            </Text>
          </View>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fffbeb" },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  heroCard: {
    backgroundColor: "#fef3c7",
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  header: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, marginLeft: 10, marginRight: 10 },
  title: { fontSize: 26, fontWeight: "900", color: "#78350f" },
  subtitle: { fontSize: 13, color: "#92400e", marginTop: 2 },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveText: { marginLeft: 6, fontSize: 11, fontWeight: "900", color: "#92400e" },
  heroCopy: { marginTop: 14, fontSize: 13, color: "#78350f", lineHeight: 20 },
  heroMetrics: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  heroMetricCard: {
    width: "48.5%",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
  },
  heroMetricLabel: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", color: "#64748b" },
  heroMetricValue: { marginTop: 8, fontSize: 18, fontWeight: "900", color: "#1f2937" },
  heroMetricMeta: { marginTop: 4, fontSize: 12, color: "#475569" },
  card: { backgroundColor: "#fff", borderRadius: 22, padding: 16, marginBottom: 14 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#546e7a", marginBottom: 10 },
  chipRow: { flexDirection: "row" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fcd34d",
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#f59e0b", borderColor: "#f59e0b" },
  chipText: { color: "#92400e", fontWeight: "700" },
  chipTextActive: { color: "#fff" },
  fetchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f59e0b",
    borderRadius: 16,
    padding: 15,
    marginTop: 14,
  },
  fetchBtnText: { color: "#fff", fontSize: 15, fontWeight: "800", marginLeft: 8 },
  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fee2e2",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: "#b91c1c", flex: 1, marginLeft: 8, fontSize: 13, lineHeight: 19 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  bannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerText: { flex: 1, marginLeft: 12 },
  bannerTitle: { fontSize: 18, fontWeight: "900" },
  bannerMeta: { fontSize: 12, color: "#546e7a", marginTop: 4, lineHeight: 17 },
  priceCard: { backgroundColor: "#fff", borderRadius: 22, padding: 16, marginBottom: 12 },
  priceTitle: { fontSize: 17, fontWeight: "900", color: "#1f2937", marginBottom: 12 },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  priceIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  priceLabel: { flex: 1, fontSize: 14, fontWeight: "700", color: "#374151" },
  priceValue: { fontSize: 15, fontWeight: "900" },
  costRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  costCard: {
    width: "31.5%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 12,
    alignItems: "center",
  },
  costValue: { fontSize: 13, fontWeight: "900", marginTop: 6, textAlign: "center" },
  costLabel: { marginTop: 4, fontSize: 10, color: "#64748b", fontWeight: "600", textAlign: "center" },
  districtCard: { backgroundColor: "#fff", borderRadius: 22, padding: 16, marginBottom: 12 },
  districtTitle: { fontSize: 17, fontWeight: "900", color: "#1f2937", marginBottom: 12 },
  districtRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  riskBar: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  riskFill: { height: "100%", borderRadius: 999 },
  districtName: { fontSize: 13, fontWeight: "700", color: "#374151", width: 80 },
  advisoryCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 5,
  },
  advisoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  advisoryTitleWrap: { flex: 1, paddingRight: 10 },
  advisoryLabel: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  advisoryHeading: { marginTop: 2, fontSize: 16, fontWeight: "900", color: "#1f2937" },
  voiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  voiceBtnText: { color: "#fff", fontSize: 12, fontWeight: "800", marginLeft: 6 },
  advisoryText: { fontSize: 15, lineHeight: 23, color: "#1f2937", marginBottom: 8 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 6 },
  tipDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: 8 },
  tipText: { flex: 1, fontSize: 13, color: "#374151", lineHeight: 19 },
  sourceRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  sourceText: { flex: 1, marginLeft: 6, fontSize: 11, color: "#64748b", lineHeight: 16 },
  emptyState: { alignItems: "center", paddingVertical: 50 },
  emptyTitle: { marginTop: 10, fontSize: 18, fontWeight: "800", color: "#64748b" },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});
