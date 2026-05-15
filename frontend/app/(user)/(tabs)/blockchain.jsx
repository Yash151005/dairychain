import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { dashboardApi, getStoredUser } from "../../../utils/api";

const flowSteps = [
  { label: "Farm Collection", icon: "leaf", tint: "#edf9ef" },
  { label: "Quality Check", icon: "flask", tint: "#eef9f1" },
  { label: "Transport", icon: "car", tint: "#f4fbf4" },
  { label: "Processing", icon: "business", tint: "#eef8ee" },
  { label: "Retail", icon: "storefront", tint: "#f8f5ea" },
];

export default function BlockchainScreen() {
  const [latestBatch, setLatestBatch] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setError("");
        const user = await getStoredUser();
        const farmerId = user?.user_id || user?.email;

        if (!farmerId) {
          return;
        }

        const response = await dashboardApi.getFarmerDashboard(farmerId);

        if (!mounted) {
          return;
        }

        setLatestBatch(response);
      } catch (error) {
        console.log("Blockchain fetch failed:", error.message);
        if (mounted) {
          setError(error.message || "Failed to load blockchain data.");
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
        <Text style={styles.title}>Blockchain Flow</Text>
        <Text style={styles.subtitle}>Track milk data from collection to retail with secure records.</Text>
      </View>

      {flowSteps.map((step, index) => (
        <View key={step.label} style={[styles.stepCard, { backgroundColor: step.tint }]}>
          <View style={styles.stepLeft}>
            <View style={styles.iconWrap}>
              <Ionicons name={step.icon} size={20} color="#2e7d32" />
            </View>
            <View>
              <Text style={styles.stepLabel}>{step.label}</Text>
              <Text style={styles.stepText}>Data hash verified and stored securely.</Text>
            </View>
          </View>
          <Text style={styles.stepIndex}>0{index + 1}</Text>
        </View>
      ))}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Latest Verified Batch</Text>
        <Text style={styles.summaryValue}>{latestBatch?.quality || "No batch yet"}</Text>
        <Text style={styles.summaryText}>
          Temperature: {latestBatch?.temperature || "0"}°C • Humidity: {latestBatch?.humidity || "0"}% • Safety: {latestBatch?.safety_index || "Unknown"}
        </Text>
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
    fontSize: 14,
    lineHeight: 20,
    color: "#4b5563",
  },
  stepCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stepLabel: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1f2937",
  },
  stepText: {
    marginTop: 3,
    color: "#64748b",
  },
  stepIndex: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2e7d32",
    marginLeft: 10,
  },
  summaryCard: {
    marginTop: 8,
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#64748b",
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 26,
    fontWeight: "800",
    color: "#1f2937",
  },
  summaryText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#4b5563",
  },
});
