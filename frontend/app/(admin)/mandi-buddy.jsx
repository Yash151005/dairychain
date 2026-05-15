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

const REGIONS = ["Pune", "Nashik", "Kolhapur", "Aurangabad", "Solapur"];

function formatUpdatedAt(value) {
  if (!value) {
    return "Ready";
  }

  try {
    return new Date(value).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Updated";
  }
}

export default function MandiBuddy() {
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
    void fetchPrices();

    return () => {
      void stopSpeaking();
    };
  }, []);

  async function fetchPrices({ isRefresh = false } = {}) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await hackathonApi.mandiBuddy(region);
      setData(response);
      setLastUpdated(new Date().toISOString());
    } catch (requestError) {
      setError(
        data
          ? `${requestError.message || "Failed to fetch prices."} Showing the last successful price view.`
          : requestError.message || "Failed to fetch prices."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function playAdvisory() {
    if (!data?.audio_text && !data?.marathi_alert) {
      return;
    }

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

  const bestCooperative = data?.insight?.best_cooperative || "";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchPrices({ isRefresh: true })}
          tintColor="#0288d1"
        />
      }
    >
      <View style={styles.heroCard}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#0288d1" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>MandiBuddy</Text>
            <Text style={styles.subtitle}>Live dairy price radar for farmers</Text>
          </View>
          <View style={styles.liveChip}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{formatUpdatedAt(lastUpdated)}</Text>
          </View>
        </View>

        <Text style={styles.heroCopy}>
          Compare regional cooperative rates quickly and keep a usable snapshot even when live search is slow.
        </Text>

        <View style={styles.heroMetrics}>
          <View style={styles.heroMetricCard}>
            <Text style={styles.heroMetricLabel}>Best Rate</Text>
            <Text style={styles.heroMetricValue}>
              {bestCooperative ? `Rs ${data?.insight?.best_rate || 0}` : "--"}
            </Text>
            <Text style={styles.heroMetricMeta}>{bestCooperative || "Waiting for data"}</Text>
          </View>
          <View style={styles.heroMetricCard}>
            <Text style={styles.heroMetricLabel}>Spread</Text>
            <Text style={styles.heroMetricValue}>
              {data ? `Rs ${data?.insight?.spread_per_litre || 0}` : "--"}
            </Text>
            <Text style={styles.heroMetricMeta}>per litre difference</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Select Region</Text>
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
          onPress={() => fetchPrices()}
          disabled={loading || refreshing}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="search" size={18} color="#fff" />
              <Text style={styles.fetchBtnText}>
                {data ? "Refresh Live Prices" : "Fetch Live Prices"}
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
          <View style={styles.insightCard}>
            <Ionicons name="bulb" size={22} color="#f59e0b" />
            <View style={styles.insightTextWrap}>
              <Text style={styles.insightTitle}>
                Rs {data.insight?.spread_per_litre || 0}/litre spread detected
              </Text>
              <Text style={styles.insightText}>
                Best rate in {region}: {bestCooperative || "Not available"}. Monthly upside can
                reach Rs {Math.round(data.insight?.monthly_income_diff || 0)} for a 10 litre/day
                farmer.
              </Text>
            </View>
          </View>

          <View style={styles.advisoryCard}>
            <View style={styles.advisoryHeader}>
              <View style={styles.advisoryTitleWrap}>
                <Text style={styles.advisoryLabel}>Marathi Suchana</Text>
                <Text style={styles.advisoryHeading}>
                  {data.advisory_heading || "Price advisory"}
                </Text>
              </View>
              <TouchableOpacity style={styles.speakBtn} onPress={playAdvisory}>
                <Ionicons name={speaking ? "pause" : "volume-high"} size={16} color="#fff" />
                <Text style={styles.speakBtnText}>{speaking ? "Stop" : "Play Audio"}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.advisoryText}>{data.marathi_alert}</Text>
            {(data.tips || []).map((tip, index) => (
              <View key={`${tip}-${index}`} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>

          <View style={styles.tableCard}>
            <Text style={styles.tableTitle}>Cooperative Prices - {data.region}</Text>
            <Text style={styles.tableUpdated}>
              Updated {data.prices?.[0]?.last_updated || "today"} | Source mode{" "}
              {data.serper_snippets > 0 ? "live-assisted" : "stable demo"}
            </Text>

            <View style={[styles.tableRow, styles.tableHeadRow]}>
              <Text style={[styles.tableHead, { flex: 2 }]}>Cooperative</Text>
              <Text style={styles.tableHead}>Cow Rs/L</Text>
              <Text style={styles.tableHead}>Buffalo Rs/L</Text>
            </View>

            {data.prices?.map((price, index) => {
              const isBest = price.cooperative === bestCooperative;
              return (
                <View
                  key={`${price.cooperative}-${index}`}
                  style={[
                    styles.tableRow,
                    index % 2 === 0 && styles.tableRowAlt,
                    isBest && styles.tableRowBest,
                  ]}
                >
                  <View style={styles.tableNameWrap}>
                    <Text style={[styles.tableName, isBest && styles.tableNameBest]}>
                      {price.cooperative}
                    </Text>
                    <Text style={styles.tableMeta}>{price.region}</Text>
                  </View>
                  <Text style={[styles.tableValue, { color: "#2e7d32" }]}>
                    Rs {price.cow_milk_rate}
                  </Text>
                  <Text style={[styles.tableValue, { color: "#7b1fa2" }]}>
                    Rs {price.buffalo_milk_rate}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.sourceRow}>
            <Ionicons name="globe-outline" size={14} color="#64748b" />
            <Text style={styles.sourceText}>
              {data.serper_snippets > 0
                ? `${data.serper_snippets} web snippets analyzed for the current price view`
                : "Demo price data shown. Add SERPER_API_KEY for live price ingestion."}
            </Text>
          </View>
        </>
      ) : (
        !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="trending-up" size={54} color="#0288d1" style={{ opacity: 0.3 }} />
            <Text style={styles.emptyTitle}>No price view yet</Text>
            <Text style={styles.emptyText}>
              Pick a region and fetch live prices to compare cooperatives and hear the Marathi
              advisory.
            </Text>
          </View>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f1f8fe" },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  heroCard: {
    backgroundColor: "#dff2ff",
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
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
  title: { fontSize: 26, fontWeight: "900", color: "#0d47a1" },
  subtitle: { fontSize: 13, color: "#4f6b82", marginTop: 2 },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2e7d32", marginRight: 6 },
  liveText: { fontSize: 11, fontWeight: "900", color: "#0288d1" },
  heroCopy: { marginTop: 14, fontSize: 13, color: "#31516b", lineHeight: 20 },
  heroMetrics: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  heroMetricCard: {
    width: "48.5%",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
  },
  heroMetricLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    color: "#64748b",
  },
  heroMetricValue: { marginTop: 8, fontSize: 18, fontWeight: "900", color: "#0d47a1" },
  heroMetricMeta: { marginTop: 4, fontSize: 12, color: "#475569" },
  card: { backgroundColor: "#fff", borderRadius: 22, padding: 16, marginBottom: 14 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#546e7a", marginBottom: 10 },
  chipRow: { flexDirection: "row" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#e3f2fd",
    borderWidth: 1,
    borderColor: "#90caf9",
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#0288d1", borderColor: "#0288d1" },
  chipText: { color: "#0288d1", fontWeight: "700" },
  chipTextActive: { color: "#fff" },
  fetchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0288d1",
    borderRadius: 16,
    padding: 15,
    marginTop: 14,
  },
  fetchBtnText: { color: "#fff", fontSize: 15, fontWeight: "800", marginLeft: 8 },
  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#fee2e2",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: "#b91c1c", flex: 1, fontSize: 13, lineHeight: 19 },
  insightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fffbeb",
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  insightTextWrap: { flex: 1, marginLeft: 10 },
  insightTitle: { fontSize: 15, fontWeight: "900", color: "#92400e" },
  insightText: { marginTop: 4, fontSize: 13, color: "#78350f", lineHeight: 19 },
  advisoryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#0288d1",
  },
  advisoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  advisoryTitleWrap: { flex: 1, paddingRight: 10 },
  advisoryLabel: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  advisoryHeading: { marginTop: 2, fontSize: 16, fontWeight: "900", color: "#0d47a1" },
  speakBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0288d1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  speakBtnText: { color: "#fff", fontSize: 12, fontWeight: "800", marginLeft: 6 },
  advisoryText: { fontSize: 15, lineHeight: 23, color: "#1f2937", marginBottom: 10 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 6 },
  tipDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#0288d1", marginTop: 6, marginRight: 8 },
  tipText: { flex: 1, fontSize: 13, color: "#374151", lineHeight: 19 },
  tableCard: { backgroundColor: "#fff", borderRadius: 22, padding: 16, marginBottom: 10 },
  tableTitle: { fontSize: 17, fontWeight: "900", color: "#1e3a5f" },
  tableUpdated: { fontSize: 11, color: "#64748b", marginTop: 3, marginBottom: 12, lineHeight: 16 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  tableHeadRow: { borderBottomWidth: 2, borderBottomColor: "#e2e8f0" },
  tableRowAlt: { backgroundColor: "#f8fbff" },
  tableRowBest: { backgroundColor: "#e3f2fd", borderRadius: 12 },
  tableHead: { flex: 1, fontSize: 12, fontWeight: "800", color: "#64748b", textTransform: "uppercase" },
  tableNameWrap: { flex: 2, paddingRight: 8 },
  tableName: { fontSize: 14, fontWeight: "800", color: "#1e3a5f" },
  tableNameBest: { color: "#0288d1" },
  tableMeta: { fontSize: 11, color: "#64748b", marginTop: 2 },
  tableValue: { flex: 1, fontSize: 15, fontWeight: "900", textAlign: "center" },
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
