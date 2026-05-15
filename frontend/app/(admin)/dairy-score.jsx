import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { farmersApi, hackathonApi } from "../../utils/api";

const PAYMENT_SCENARIOS = [
  { label: "Milk Payment - 15 Days", amount: 1200 },
  { label: "Milk Payment - Monthly", amount: 2800 },
  { label: "Insurance Premium", amount: 200 },
  { label: "KCC Loan EMI", amount: 3200 },
];

function ScoreRing({ score = 300, grade = "Pending" }) {
  const pct = ((score - 300) / 600) * 100;
  const color =
    score >= 750 ? "#2e7d32" :
    score >= 650 ? "#0288d1" :
    score >= 550 ? "#f59e0b" : "#e53935";

  return (
    <View style={ring.wrap}>
      <View style={[ring.outer, { borderColor: color }]}>
        <Text style={[ring.score, { color }]}>{score}</Text>
        <Text style={ring.subText}>/900</Text>
        <View style={[ring.gradeBadge, { backgroundColor: color }]}>
          <Text style={ring.gradeText}>{grade}</Text>
        </View>
      </View>
      <View style={ring.track}>
        <View style={[ring.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const ring = StyleSheet.create({
  wrap: { alignItems: "center", marginVertical: 8 },
  outer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  score: { fontSize: 40, fontWeight: "900" },
  subText: { fontSize: 13, color: "#64748b", fontWeight: "700" },
  gradeBadge: { marginTop: 8, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  gradeText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  track: { marginTop: 14, width: "100%", height: 10, borderRadius: 999, backgroundColor: "#e2e8f0", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999 },
});

export default function DairyScore() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [farmers, setFarmers] = useState([]);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [showFarmerList, setShowFarmerList] = useState(false);
  const [loadingFarmers, setLoadingFarmers] = useState(true);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedScenario, setSelectedScenario] = useState(PAYMENT_SCENARIOS[1]);
  const [payLoading, setPayLoading] = useState(false);
  const [payStatus, setPayStatus] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const response = await farmersApi.list();
        if (!mounted) {
          return;
        }

        const farmerRows = Array.isArray(response?.farmers) ? response.farmers : [];
        setFarmers(farmerRows);
        setSelectedFarmer(farmerRows[0] || null);
      } catch (loadError) {
        if (mounted) {
          setError(loadError.message || "Unable to load farmer list.");
        }
      } finally {
        if (mounted) {
          setLoadingFarmers(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function generateScore() {
    if (!selectedFarmer?.user_id) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await hackathonApi.dairyScore(selectedFarmer.user_id);
      setData(response);
    } catch (requestError) {
      setError(requestError.message || "Failed to generate DairyScore.");
    } finally {
      setLoading(false);
    }
  }

  async function initiatePayment() {
    if (!selectedFarmer?.user_id) {
      setPayStatus("Select a farmer before opening the payment flow.");
      return;
    }

    setPayLoading(true);
    setPayStatus("");

    try {
      const response = await hackathonApi.createPaymentLink({
        display_amount: selectedScenario.amount,
        purpose: selectedScenario.label,
        farmer_id: selectedFarmer.user_id,
      });

      if (!response.payment_url) {
        setPayStatus("Demo mode is active. Add Razorpay keys to backend .env for live links.");
        return;
      }

      if (Platform.OS === "web") {
        await Linking.openURL(response.payment_url);
        setPayStatus("Opened in the browser on web. In Android or iOS dev build it opens inside the app.");
        return;
      }

      router.push({
        pathname: "/(admin)/payment-webview",
        params: {
          url: encodeURIComponent(response.payment_url),
          title: selectedScenario.label,
          farmerName: selectedFarmer.name || selectedFarmer.user_id,
        },
      });
      setPayStatus("Payment page opened inside the app.");
    } catch (requestError) {
      setPayStatus(requestError.message || "Payment initiation failed.");
    } finally {
      setPayLoading(false);
    }
  }

  const metrics = data?.metrics;
  const kcc = data?.kcc_recommendation;
  const insurance = data?.insurance;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#7b1fa2" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>DairyScore</Text>
          <Text style={styles.subtitle}>Admin finance view with farmer-name selection</Text>
        </View>
        <Ionicons name="shield-checkmark" size={30} color="#7b1fa2" />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Select Farmer</Text>
        <TouchableOpacity
          style={styles.selectorButton}
          activeOpacity={0.88}
          onPress={() => setShowFarmerList((value) => !value)}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.selectorValue}>
              {selectedFarmer?.name || (loadingFarmers ? "Loading farmers..." : "No farmers found")}
            </Text>
            <Text style={styles.selectorMeta}>
              {selectedFarmer?.village || selectedFarmer?.location || selectedFarmer?.user_id || "Choose a farmer name"}
            </Text>
          </View>
          <Ionicons name={showFarmerList ? "chevron-up" : "chevron-down"} size={20} color="#7b1fa2" />
        </TouchableOpacity>

        {showFarmerList ? (
          <View style={styles.dropdownCard}>
            {farmers.map((farmer) => {
              const active = selectedFarmer?.user_id === farmer.user_id;
              return (
                <TouchableOpacity
                  key={farmer.user_id}
                  style={[styles.dropdownRow, active && styles.dropdownRowActive]}
                  onPress={() => {
                    setSelectedFarmer(farmer);
                    setShowFarmerList(false);
                    setData(null);
                    setPayStatus("");
                  }}
                >
                  <View style={[styles.dropdownAvatar, active && styles.dropdownAvatarActive]}>
                    <Ionicons name="person" size={16} color={active ? "#fff" : "#7b1fa2"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dropdownName, active && styles.dropdownNameActive]}>
                      {farmer.name || farmer.user_id}
                    </Text>
                    <Text style={[styles.dropdownMeta, active && styles.dropdownMetaActive]}>
                      {farmer.village || farmer.location || farmer.user_id}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={generateScore}
          disabled={loading || loadingFarmers || !selectedFarmer}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="analytics" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Generate DairyScore</Text>
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
          <View style={styles.card}>
            <Text style={styles.profileLabel}>
              {data.farmer_name || selectedFarmer?.name || selectedFarmer?.user_id}
            </Text>
            <ScoreRing score={data.dairy_score} grade={data.grade} />
          </View>

          <View style={styles.metricGrid}>
            {[
              { label: "Delivery Days", value: `${metrics?.delivery_days || 0}`, icon: "calendar", color: "#0288d1" },
              { label: "Consistency", value: `${metrics?.delivery_rate_percent || 0}%`, icon: "checkmark-circle", color: "#2e7d32" },
              { label: "Payments", value: `${metrics?.payment_count || 0}`, icon: "cash", color: "#7b1fa2" },
              { label: "Monthly Income", value: `Rs ${Math.round(metrics?.monthly_income_estimate || 0)}`, icon: "trending-up", color: "#f57c00" },
            ].map((item) => (
              <View key={item.label} style={styles.metricCard}>
                <Ionicons name={item.icon} size={18} color={item.color} />
                <Text style={[styles.metricValue, { color: item.color }]}>{item.value}</Text>
                <Text style={styles.metricLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <Ionicons name="document-text" size={18} color="#7b1fa2" />
              <Text style={styles.reportTitle}>Credit Summary</Text>
            </View>
            <Text style={styles.reportText}>{data.credit_report}</Text>
          </View>

          <View style={[styles.card, kcc?.eligible ? styles.kccEligible : styles.kccMuted]}>
            <View style={styles.kccHeader}>
              <Text style={styles.kccTitle}>Kisan Credit Card Recommendation</Text>
              <View style={[styles.kccBadge, { backgroundColor: kcc?.eligible ? "#2e7d32" : "#94a3b8" }]}>
                <Text style={styles.kccBadgeText}>{kcc?.eligible ? "Eligible" : "Review Needed"}</Text>
              </View>
            </View>
            <Text style={styles.kccRow}>Suggested limit: Rs {kcc?.suggested_limit?.toLocaleString?.() || kcc?.suggested_limit || 0}</Text>
            <Text style={styles.kccRow}>Interest rate: {kcc?.interest_rate || 0}% p.a.</Text>
            <Text style={styles.kccRow}>Tenure: {kcc?.tenure_months || 0} months</Text>
          </View>

          <View style={styles.insuranceCard}>
            <Text style={styles.insuranceTitle}>Livestock Insurance Snapshot</Text>
            <Text style={styles.insuranceText}>Coverage: Rs {insurance?.coverage?.toLocaleString?.() || insurance?.coverage || 0}</Text>
            <Text style={styles.insuranceText}>Farmer pays: Rs {insurance?.farmer_pays_monthly || 0}/month</Text>
            <Text style={styles.insuranceText}>Full premium: Rs {insurance?.premium_monthly || 0}/month</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.paymentHeader}>
              <Text style={styles.paymentTitle}>In-app payment demo</Text>
              <View style={styles.paymentBadge}>
                <Text style={styles.paymentBadgeText}>Razorpay</Text>
              </View>
            </View>
            <Text style={styles.paymentNote}>
              Choose a payment scenario. The actual charge is Rs 1 for the demo link.
            </Text>

            {PAYMENT_SCENARIOS.map((scenario) => {
              const active = scenario.label === selectedScenario.label;
              return (
                <TouchableOpacity
                  key={scenario.label}
                  onPress={() => setSelectedScenario(scenario)}
                  style={[styles.scenarioRow, active && styles.scenarioRowActive]}
                >
                  <View style={[styles.radio, active && styles.radioActive]} />
                  <Text style={styles.scenarioLabel}>{scenario.label}</Text>
                  <Text style={styles.scenarioAmount}>Rs {scenario.amount}</Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={styles.payBtn} onPress={initiatePayment} disabled={payLoading}>
              {payLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="card" size={18} color="#fff" />
                  <Text style={styles.payBtnText}>Open Payment Inside App</Text>
                </>
              )}
            </TouchableOpacity>

            {payStatus ? (
              <View style={styles.payStatus}>
                <Ionicons name="information-circle" size={16} color="#7b1fa2" />
                <Text style={styles.payStatusText}>{payStatus}</Text>
              </View>
            ) : null}
          </View>
        </>
      ) : (
        !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark" size={54} color="#7b1fa2" style={{ opacity: 0.3 }} />
            <Text style={styles.emptyTitle}>No score yet</Text>
            <Text style={styles.emptyText}>
              Choose a farmer name and generate their DairyScore to review finance and payment actions.
            </Text>
          </View>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fdf4ff" },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f3e5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, marginLeft: 10 },
  title: { fontSize: 24, fontWeight: "900", color: "#4a148c" },
  subtitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 16, marginBottom: 12 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#64748b", marginBottom: 8 },
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#faf5ff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },
  selectorValue: { fontSize: 16, fontWeight: "800", color: "#1f2937" },
  selectorMeta: { marginTop: 2, fontSize: 12, color: "#64748b" },
  dropdownCard: { marginTop: 10, borderRadius: 14, backgroundColor: "#faf5ff", overflow: "hidden" },
  dropdownRow: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: "#efe3fb" },
  dropdownRowActive: { backgroundColor: "#7b1fa2" },
  dropdownAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ede7f6",
    marginRight: 10,
  },
  dropdownAvatarActive: { backgroundColor: "rgba(255,255,255,0.24)" },
  dropdownName: { fontSize: 14, fontWeight: "800", color: "#1f2937" },
  dropdownNameActive: { color: "#fff" },
  dropdownMeta: { fontSize: 11, color: "#64748b", marginTop: 2 },
  dropdownMetaActive: { color: "rgba(255,255,255,0.78)" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7b1fa2",
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800", marginLeft: 8 },
  errorCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fee2e2", borderRadius: 14, padding: 12, marginBottom: 12 },
  errorText: { flex: 1, color: "#b91c1c", marginLeft: 8 },
  profileLabel: { textAlign: "center", fontSize: 15, fontWeight: "800", color: "#7b1fa2" },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 12 },
  metricCard: { width: "48.5%", backgroundColor: "#fff", borderRadius: 18, padding: 14, alignItems: "center", marginBottom: 8 },
  metricValue: { fontSize: 18, fontWeight: "900", marginTop: 6 },
  metricLabel: { marginTop: 4, fontSize: 11, color: "#64748b", fontWeight: "700", textAlign: "center" },
  reportCard: { backgroundColor: "#fff", borderRadius: 20, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: "#7b1fa2" },
  reportHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  reportTitle: { marginLeft: 8, fontSize: 15, fontWeight: "800", color: "#1f2937" },
  reportText: { color: "#374151", lineHeight: 21 },
  kccEligible: { borderWidth: 1.5, borderColor: "#a5d6a7" },
  kccMuted: { borderWidth: 1.5, borderColor: "#e2e8f0" },
  kccHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  kccTitle: { flex: 1, fontSize: 15, fontWeight: "800", color: "#1f2937" },
  kccBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  kccBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  kccRow: { fontSize: 13, color: "#374151", marginTop: 6 },
  insuranceCard: { backgroundColor: "#e3f2fd", borderRadius: 20, padding: 16, marginBottom: 12 },
  insuranceTitle: { fontSize: 16, fontWeight: "800", color: "#0d47a1", marginBottom: 10 },
  insuranceText: { fontSize: 13, color: "#0f172a", marginTop: 4 },
  paymentHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  paymentTitle: { flex: 1, fontSize: 16, fontWeight: "900", color: "#4a148c" },
  paymentBadge: { backgroundColor: "#7b1fa2", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  paymentBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  paymentNote: { fontSize: 12, color: "#64748b", lineHeight: 18, marginBottom: 12 },
  scenarioRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#faf5ff", borderRadius: 12, padding: 12, marginBottom: 8 },
  scenarioRowActive: { borderWidth: 1, borderColor: "#ce93d8", backgroundColor: "#f3e5f5" },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#b39ddb", marginRight: 10 },
  radioActive: { backgroundColor: "#7b1fa2", borderColor: "#7b1fa2" },
  scenarioLabel: { flex: 1, fontSize: 13, fontWeight: "700", color: "#374151" },
  scenarioAmount: { fontSize: 14, fontWeight: "900", color: "#7b1fa2" },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7b1fa2",
    borderRadius: 14,
    padding: 15,
    marginTop: 6,
  },
  payBtnText: { color: "#fff", fontSize: 15, fontWeight: "900", marginLeft: 8 },
  payStatus: { flexDirection: "row", alignItems: "center", backgroundColor: "#f3e5f5", borderRadius: 12, padding: 10, marginTop: 10 },
  payStatusText: { flex: 1, color: "#6b21a8", marginLeft: 8, fontSize: 12, lineHeight: 18 },
  emptyState: { alignItems: "center", paddingVertical: 56 },
  emptyTitle: { marginTop: 10, fontSize: 18, fontWeight: "800", color: "#64748b" },
  emptyText: { marginTop: 8, fontSize: 13, color: "#94a3b8", textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },
});
