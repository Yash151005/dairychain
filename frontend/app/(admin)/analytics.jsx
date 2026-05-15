import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { adminApi, analyticsApi } from "../../utils/api";

export default function Analytics() {
  const [reports, setReports] = useState({ total: 0, pure: 0, adulterated: 0 });
  const [milkTrend, setMilkTrend] = useState([]);
  const [qualityTrend, setQualityTrend] = useState([]);
  const [topFarmers, setTopFarmers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setError("");
        const [reportsJson, milkJson, qualityJson, farmersJson] = await Promise.all([
          adminApi.reports(),
          analyticsApi.milkTrend(),
          analyticsApi.qualityTrend(),
          adminApi.farmersPerformance(),
        ]);

        if (!mounted) {
          return;
        }

        setReports({
          total: reportsJson?.total || 0,
          pure: reportsJson?.pure || 0,
          adulterated: reportsJson?.adulterated || 0,
        });
        setMilkTrend(milkJson?.trend || []);
        setQualityTrend(qualityJson?.trend || []);
        setTopFarmers(farmersJson?.top_farmers || []);
      } catch (error) {
        console.log("Analytics fetch failed:", error.message);
        if (mounted) {
          setError(error.message || "Failed to load analytics data.");
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const maxMilk = Math.max(
    ...milkTrend.map((item) => Number(item.litres) || 0),
    1
  );
  const averageQuality =
    qualityTrend.length > 0
      ? (
          qualityTrend.reduce((sum, item) => sum + (Number(item.score) || 0), 0) /
          qualityTrend.length
        ).toFixed(1)
      : "0.0";

  const metrics = [
    { label: "Milk Batches", value: `${reports.total}`, icon: "water", tint: "#edf9ef" },
    { label: "Pure Batches", value: `${reports.pure}`, icon: "leaf", tint: "#eef9f1" },
    { label: "Adulterated", value: `${reports.adulterated}`, icon: "warning", tint: "#fff4e6" },
    { label: "Avg Quality", value: `${averageQuality}%`, icon: "flask", tint: "#f4fbf4" },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Backend data not loaded</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.heroCard}>
        <Text style={styles.title}>Milk Analytics</Text>
        <Text style={styles.subtitle}>
          Daily collection and quality trends pulled from the backend database.
        </Text>
      </View>

      {metrics.map((metric) => (
        <View key={metric.label} style={[styles.metricCard, { backgroundColor: metric.tint }]}>
          <View style={styles.metricLeft}>
            <Ionicons name={metric.icon} size={20} color="#2e7d32" />
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
          <Text style={styles.metricValue}>{metric.value}</Text>
        </View>
      ))}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Milk Trend</Text>
        <View style={styles.barRow}>
          {milkTrend.slice(0, 5).map((item, index) => {
            const litres = Number(item.litres) || 0;
            const height = Math.max(24, (litres / maxMilk) * 110);

            return (
              <View key={`${item.date}-${index}`} style={styles.barColumn}>
                <View style={[styles.bar, { height }]} />
                <Text style={styles.barLabel}>{litres}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.summaryText}>
          The chart reflects the latest records stored in `batch_collection`.
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Top Farmers</Text>
        {topFarmers.length ? (
          topFarmers.slice(0, 5).map((farmer) => (
            <View key={farmer._id} style={styles.farmerRow}>
              <View>
                <Text style={styles.farmerName}>{farmer._id}</Text>
                <Text style={styles.farmerMeta}>
                  {farmer.total_batches || 0} batches • Avg quality{" "}
                  {Number(farmer.avg_quality || 0).toFixed(1)}
                </Text>
              </View>
              <Text style={styles.farmerScore}>
                {Number(farmer.avg_quality || 0).toFixed(1)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.summaryText}>No farmer performance data available yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f5",
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  errorCard: {
    backgroundColor: "#fff4e6",
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#9a3412",
  },
  errorText: {
    marginTop: 4,
    color: "#b45309",
    lineHeight: 20,
  },
  heroCard: {
    backgroundColor: "#eaf7ea",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1f2937",
  },
  subtitle: {
    marginTop: 6,
    color: "#64748b",
    lineHeight: 20,
  },
  metricCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricLabel: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2e7d32",
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    marginTop: 6,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 16,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 120,
  },
  barColumn: {
    alignItems: "center",
    justifyContent: "flex-end",
    width: "18%",
  },
  bar: {
    width: "16%",
    borderRadius: 12,
    backgroundColor: "#8ccf8c",
  },
  barLabel: {
    marginTop: 6,
    fontSize: 11,
    color: "#64748b",
  },
  summaryText: {
    marginTop: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  farmerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  farmerName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1f2937",
  },
  farmerMeta: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748b",
  },
  farmerScore: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2e7d32",
  },
});
