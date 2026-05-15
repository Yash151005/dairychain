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

function THIGauge({ thi = 0 }) {
  const pct = Math.min(100, Math.max(0, ((thi - 60) / 30) * 100));
  const color =
    thi < 72 ? "#2e7d32" : thi < 78 ? "#f59e0b" : thi < 84 ? "#ef6c00" : "#dc2626";

  return (
    <View style={gauge.wrap}>
      <Text style={gauge.label}>THI Index</Text>
      <View style={gauge.track}>
        <View style={[gauge.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <View style={gauge.markerRow}>
        <Text style={gauge.markerText}>60</Text>
        <Text style={gauge.markerText}>72</Text>
        <Text style={gauge.markerText}>78</Text>
        <Text style={gauge.markerText}>84</Text>
      </View>
      <Text style={[gauge.value, { color }]}>{thi}</Text>
    </View>
  );
}

const gauge = StyleSheet.create({
  wrap: { marginVertical: 8 },
  label: { fontSize: 12, fontWeight: "700", color: "#546e7a", marginBottom: 8 },
  track: { height: 14, borderRadius: 999, backgroundColor: "#e2e8f0", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999 },
  markerRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  markerText: { fontSize: 10, color: "#64748b", fontWeight: "600" },
  value: { textAlign: "center", fontSize: 38, fontWeight: "900", marginTop: 6 },
});

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

export default function DudhDarpan() {
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
    void analyze();

    return () => {
      void stopSpeaking();
    };
  }, []);

  async function analyze({ isRefresh = false } = {}) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await hackathonApi.dudhDarpan(region);
      setData(response);
      setLastUpdated(new Date().toISOString());
    } catch (requestError) {
      setError(
        data
          ? `${requestError.message || "Analysis failed."} Showing the last successful heat snapshot.`
          : requestError.message || "Analysis failed."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function playMarathiAlert() {
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

  const color = data?.color || "#e53935";
  const tempCelsius = data?.weather?.temperature_celsius ?? data?.weather?.temperature;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => analyze({ isRefresh: true })}
          tintColor="#e53935"
        />
      }
    >
      <View style={styles.heroCard}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#e53935" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>DudhDarpan</Text>
            <Text style={styles.subtitle}>Heat-stress yield predictor</Text>
          </View>
          <View style={styles.liveChip}>
            <Ionicons name="pulse" size={13} color="#991b1b" />
            <Text style={styles.liveText}>{formatUpdatedAt(lastUpdated)}</Text>
          </View>
        </View>

        <Text style={styles.heroCopy}>
          Watch heat risk in Celsius, keep the last safe advisory on screen, and refresh when the forecast changes.
        </Text>

        <View style={styles.heroMetrics}>
          <View style={styles.heroMetricCard}>
            <Text style={styles.heroMetricLabel}>Temperature</Text>
            <Text style={styles.heroMetricValue}>
              {tempCelsius !== undefined ? `${tempCelsius} C` : "--"}
            </Text>
            <Text style={styles.heroMetricMeta}>Current forecast input</Text>
          </View>
          <View style={styles.heroMetricCard}>
            <Text style={styles.heroMetricLabel}>Yield Risk</Text>
            <Text style={[styles.heroMetricValue, { color }]}>
              {data ? `-${data.yield_decline_percent}%` : "--"}
            </Text>
            <Text style={styles.heroMetricMeta}>{data?.stress_level || "Waiting for data"}</Text>
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
          style={styles.analyzeBtn}
          onPress={() => analyze()}
          disabled={loading || refreshing}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="analytics" size={18} color="#fff" />
              <Text style={styles.analyzeBtnText}>
                {data ? "Refresh Heat Analysis" : "Analyze Heat Conditions"}
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
          <View style={[styles.banner, { backgroundColor: `${color}16`, borderColor: color }]}>
            <View style={[styles.bannerIcon, { backgroundColor: color }]}>
              <Ionicons name="flame" size={22} color="#fff" />
            </View>
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, { color }]}>{data.stress_level}</Text>
              <Text style={styles.bannerMeta}>
                {data.region} | Temperature {tempCelsius} C | Humidity{" "}
                {data?.weather?.humidity_percent ?? data?.weather?.humidity}%
              </Text>
            </View>
            <View style={[styles.lossBadge, { backgroundColor: color }]}>
              <Text style={styles.lossValue}>-{data.yield_decline_percent}%</Text>
              <Text style={styles.lossLabel}>yield</Text>
            </View>
          </View>

          <View style={styles.card}>
            <THIGauge thi={data.thi} />
          </View>

          <View style={styles.metricRow}>
            {[
              {
                label: "Daily Loss (Litres)",
                value: `${data.impact?.daily_loss_litres || 0} L`,
                color: "#e53935",
                icon: "water",
              },
              {
                label: "Daily Loss (Rs)",
                value: `Rs ${Math.round(data.impact?.daily_loss_rupees || 0)}`,
                color: "#f57c00",
                icon: "cash",
              },
              {
                label: "Monthly Loss",
                value: `Rs ${Math.round(data.impact?.monthly_loss_rupees || 0)}`,
                color: "#7b1fa2",
                icon: "calendar",
              },
            ].map((item) => (
              <View key={item.label} style={styles.metricCard}>
                <Ionicons name={item.icon} size={18} color={item.color} />
                <Text style={[styles.metricValue, { color: item.color }]}>{item.value}</Text>
                <Text style={styles.metricLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.advisoryCard, { borderLeftColor: color }]}>
            <View style={styles.advisoryHeader}>
              <View style={styles.advisoryTitleWrap}>
                <Text style={styles.advisoryLabel}>Marathi Suchana</Text>
                <Text style={styles.advisoryTitle}>
                  {data.advisory_heading || "Heat advisory"}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.voiceBtn, { backgroundColor: color }]}
                onPress={playMarathiAlert}
              >
                <Ionicons name={speaking ? "pause" : "volume-high"} size={16} color="#fff" />
                <Text style={styles.voiceBtnText}>{speaking ? "Stop" : "Play Audio"}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.advisoryText}>{data.marathi_alert}</Text>
            {(data.tips || []).map((tip, index) => (
              <View key={`${tip}-${index}`} style={styles.tipRow}>
                <View style={[styles.tipDot, { backgroundColor: color }]} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="thermometer" size={54} color="#e53935" style={{ opacity: 0.3 }} />
            <Text style={styles.emptyTitle}>No analysis yet</Text>
            <Text style={styles.emptyText}>
              Select a region to see temperature in Celsius, THI risk, and Marathi AI guidance.
            </Text>
          </View>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff5f5" },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  heroCard: {
    backgroundColor: "#ffe4e4",
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
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
  title: { fontSize: 26, fontWeight: "900", color: "#b71c1c" },
  subtitle: { fontSize: 13, color: "#6b4b4b", marginTop: 2 },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  liveText: { marginLeft: 6, fontSize: 11, fontWeight: "900", color: "#991b1b" },
  heroCopy: { marginTop: 14, fontSize: 13, color: "#6b4b4b", lineHeight: 20 },
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
  heroMetricValue: { marginTop: 8, fontSize: 18, fontWeight: "900", color: "#1f2937" },
  heroMetricMeta: { marginTop: 4, fontSize: 12, color: "#475569" },
  card: { backgroundColor: "#fff", borderRadius: 22, padding: 16, marginBottom: 12 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#546e7a", marginBottom: 10 },
  chipRow: { flexDirection: "row" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fce4ec",
    borderWidth: 1,
    borderColor: "#ef9a9a",
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#e53935", borderColor: "#e53935" },
  chipText: { color: "#e53935", fontWeight: "700" },
  chipTextActive: { color: "#fff" },
  analyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e53935",
    borderRadius: 16,
    padding: 15,
    marginTop: 14,
  },
  analyzeBtnText: { color: "#fff", fontSize: 15, fontWeight: "800", marginLeft: 8 },
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
  bannerText: { flex: 1, marginLeft: 12, marginRight: 12 },
  bannerTitle: { fontSize: 20, fontWeight: "900" },
  bannerMeta: { fontSize: 12, color: "#546e7a", marginTop: 4, lineHeight: 17 },
  lossBadge: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center" },
  lossValue: { color: "#fff", fontSize: 18, fontWeight: "900" },
  lossLabel: { color: "#fff", fontSize: 10, fontWeight: "700" },
  metricRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  metricCard: {
    width: "31.5%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 12,
    alignItems: "center",
  },
  metricValue: { fontSize: 15, fontWeight: "900", marginTop: 6, textAlign: "center" },
  metricLabel: { marginTop: 4, fontSize: 10, color: "#64748b", fontWeight: "600", textAlign: "center" },
  advisoryCard: { backgroundColor: "#fff", borderRadius: 22, padding: 16, marginBottom: 12, borderLeftWidth: 5 },
  advisoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  advisoryTitleWrap: { flex: 1, paddingRight: 10 },
  advisoryLabel: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  advisoryTitle: { marginTop: 2, fontSize: 16, fontWeight: "900", color: "#1f2937" },
  voiceBtn: { flexDirection: "row", alignItems: "center", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  voiceBtnText: { color: "#fff", fontSize: 12, fontWeight: "800", marginLeft: 6 },
  advisoryText: { fontSize: 15, lineHeight: 23, color: "#1f2937", marginBottom: 8 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 6 },
  tipDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: 8 },
  tipText: { flex: 1, fontSize: 13, color: "#374151", lineHeight: 19 },
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
