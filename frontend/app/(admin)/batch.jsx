import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppToast from "../../components/app-toast";
import useToast from "../../components/use-toast";
import { batchApi, farmersApi } from "../../utils/api";

function generateBatchId() {
  const now = new Date();
  const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rnd = Math.floor(Math.random() * 9000 + 1000);
  return `MILK-${yymm}-${rnd}`;
}

const FLOW_STEPS = [
  { label: "Farm Collection",  icon: "home-outline",     step: 1 },
  { label: "Quality Check",    icon: "beaker-outline",   step: 2 },
  { label: "Blockchain Log",   icon: "cube-outline",     step: 3 },
  { label: "Dispatch Ready",   icon: "car-outline",      step: 4 },
];

function FlowStep({ label, icon, active, last }) {
  return (
    <View style={flowStyles.wrap}>
      <View style={[flowStyles.dot, active && flowStyles.dotActive]}>
        <Ionicons name={icon} size={13} color={active ? "#ffffff" : "#94a3b8"} />
      </View>
      <Text style={[flowStyles.label, active && flowStyles.labelActive]} numberOfLines={2}>
        {label}
      </Text>
      {!last && <View style={flowStyles.line} />}
    </View>
  );
}

const flowStyles = StyleSheet.create({
  wrap: { alignItems: "center", flex: 1 },
  dot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  dotActive: { backgroundColor: "#2e7d32" },
  label: { fontSize: 10, color: "#94a3b8", textAlign: "center", fontWeight: "600", lineHeight: 14 },
  labelActive: { color: "#2e7d32", fontWeight: "800" },
  line: {
    position: "absolute",
    top: 17,
    left: "78%",
    right: "-28%",
    height: 2,
    backgroundColor: "#e2e8f0",
    zIndex: -1,
  },
});

export default function CreateBatch() {
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [batchId, setBatchId] = useState(generateBatchId);
  const [farmerId, setFarmerId]     = useState("");
  const [farmers, setFarmers]       = useState([]);
  const [quantity, setQuantity]     = useState("");
  const [fat, setFat]               = useState("");
  const [snf, setSnf]               = useState("");
  const [temperature, setTemp]      = useState("");
  const [humidity, setHumidity]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(null);

  useEffect(() => {
    farmersApi.list()
      .then((res) => setFarmers(res?.farmers || (Array.isArray(res) ? res : [])))
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!farmerId.trim())            { showToast("Farmer ID is required.", "error");           return; }
    if (!fat.trim()    || isNaN(Number(fat)))         { showToast("Fat % is required.", "error");            return; }
    if (!snf.trim()    || isNaN(Number(snf)))         { showToast("SNF % is required.", "error");            return; }
    if (!temperature.trim() || isNaN(Number(temperature))) { showToast("Temperature is required.", "error"); return; }

    setLoading(true);
    try {
      // Backend schema: BatchCreate { farmerId, fat, snf, temperature }
      const payload = {
        farmerId:    farmerId.trim(),
        fat:         Number(fat),
        snf:         Number(snf),
        temperature: Number(temperature),
      };

      const res = await batchApi.create(payload);
      const createdBatchId = res?.batch_id || batchId;
      // Fallback QR URL using public API if backend didn't return one
      const qrUrl = res?.qr_url
        || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${createdBatchId}&color=1b5e20`;
      setSuccess({
        batch_id:  createdBatchId,
        farmer_id: farmerId,
        quantity:  quantity || "—",
        qr_url:    qrUrl,
      });
    } catch (err) {
      showToast(err.message || "Failed to create batch.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setBatchId(generateBatchId());
    setFarmerId(""); setQuantity(""); setFat("");
    setSnf(""); setTemp(""); setHumidity("");
    setSuccess(null);
  };

  // ─── Success screen ───────────────────────────────────────────────────────────
  if (success) {
    return (
      <View style={styles.screen}>
        <AppToast message={toast.message} type={toast.type} />

        <ScrollView contentContainerStyle={styles.successContent}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={56} color="#2e7d32" />
            </View>
            <Text style={styles.successTitle}>Batch Created!</Text>
            <Text style={styles.successSub}>
              The batch has been recorded and will be logged to the blockchain.
            </Text>

            {/* Flow all-done */}
            <View style={styles.flowRow}>
              {FLOW_STEPS.map((s, i) => (
                <FlowStep key={s.step} {...s} active last={i === FLOW_STEPS.length - 1} />
              ))}
            </View>

            {/* QR Code */}
            <View style={styles.qrCard}>
              <Text style={styles.qrLabel}>Scan QR to verify batch</Text>
              <View style={styles.qrFrame}>
                <Image
                  source={{ uri: success.qr_url }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.qrBatchId}>{success.batch_id}</Text>
              <TouchableOpacity
                style={styles.shareBtn}
                activeOpacity={0.85}
                onPress={() =>
                  Share.share({
                    message: `SmartShetakari Batch: ${success.batch_id}\nScan QR: ${success.qr_url}`,
                    title: "Share Batch QR",
                  })
                }
              >
                <Ionicons name="share-social-outline" size={16} color="#2e7d32" />
                <Text style={styles.shareBtnText}>Share QR</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.detailsCard}>
              {[
                { label: "Batch ID",  value: success.batch_id  },
                { label: "Farmer",    value: success.farmer_id },
                { label: "Quantity",  value: `${success.quantity} L` },
              ].map((row) => (
                <View key={row.label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{row.label}</Text>
                  <Text style={styles.detailValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleReset} activeOpacity={0.85}>
              <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
              <Text style={styles.primaryBtnText}>Create Another Batch</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={() => router.replace("/(admin)/(tabs)/home")}
              activeOpacity={0.85}
            >
              <Text style={styles.ghostBtnText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Form ─────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <AppToast message={toast.message} type={toast.type} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Header card */}
        <View style={styles.headerCard}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="water" size={22} color="#2e7d32" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Create Milk Batch</Text>
            <Text style={styles.headerSub}>Log a new dairy collection into the system</Text>
          </View>
        </View>

        {/* Flow progress */}
        <View style={styles.flowCard}>
          <Text style={styles.sectionLabel}>Batch Flow</Text>
          <View style={styles.flowRow}>
            {FLOW_STEPS.map((s, i) => (
              <FlowStep
                key={s.step}
                {...s}
                active={s.step === 1}
                last={i === FLOW_STEPS.length - 1}
              />
            ))}
          </View>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>Batch Information</Text>

          {/* Batch ID */}
          <Text style={styles.fieldLabel}>Batch ID</Text>
          <View style={styles.batchIdRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={batchId}
              onChangeText={setBatchId}
              autoCapitalize="characters"
              placeholder="MILK-YYMM-XXXX"
              placeholderTextColor="#94a3b8"
            />
            <TouchableOpacity
              style={styles.regenBtn}
              onPress={() => setBatchId(generateBatchId())}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={18} color="#2e7d32" />
            </TouchableOpacity>
          </View>

          {/* Farmer ID */}
          <Text style={styles.fieldLabel}>Farmer ID</Text>
          <TextInput
            style={styles.input}
            value={farmerId}
            onChangeText={setFarmerId}
            placeholder="Enter farmer email or ID"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
          />

          {/* Farmer chips */}
          {farmers.length > 0 && (
            <>
              <Text style={styles.chipsLabel}>Quick-select a farmer</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                {farmers.slice(0, 10).map((f) => {
                  const id   = f.email || f.user_id || f._id || "";
                  const name = f.name  || f.email   || id;
                  const active = farmerId === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setFarmerId(id)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="person-outline"
                        size={12}
                        color={active ? "#ffffff" : "#2e7d32"}
                      />
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* Quantity */}
          <Text style={styles.fieldLabel}>Quantity (Litres)</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            placeholder="e.g. 25"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.sectionLabel} style={{ marginTop: 14 }}>Quality Readings</Text>

          {/* Fat + SNF */}
          <View style={styles.twoCol}>
            <View style={styles.colField}>
              <Text style={styles.fieldLabel}>Fat %</Text>
              <TextInput
                style={styles.input}
                value={fat}
                onChangeText={setFat}
                keyboardType="decimal-pad"
                placeholder="e.g. 4.2"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.colField}>
              <Text style={styles.fieldLabel}>SNF %</Text>
              <TextInput
                style={styles.input}
                value={snf}
                onChangeText={setSnf}
                keyboardType="decimal-pad"
                placeholder="e.g. 8.5"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          {/* Temperature + Humidity */}
          <View style={styles.twoCol}>
            <View style={styles.colField}>
              <Text style={styles.fieldLabel}>Temperature (°C)</Text>
              <TextInput
                style={styles.input}
                value={temperature}
                onChangeText={setTemp}
                keyboardType="decimal-pad"
                placeholder="e.g. 4.0"
                placeholderTextColor="#94a3b8"
              />
            </View>
            <View style={styles.colField}>
              <Text style={styles.fieldLabel}>Humidity (%)</Text>
              <TextInput
                style={styles.input}
                value={humidity}
                onChangeText={setHumidity}
                keyboardType="decimal-pad"
                placeholder="e.g. 70"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                <Text style={styles.primaryBtnText}>Create Batch</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f6f5" },
  content: { padding: 16, paddingBottom: 32 },
  successContent: { flexGrow: 1, justifyContent: "center", padding: 20 },

  // ── Header card ──────────────────────────────────────────────────────────────
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#edf9ef",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    gap: 14,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#d4f1d9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2937" },
  headerSub:   { marginTop: 3, fontSize: 13, color: "#64748b" },

  // ── Flow card ─────────────────────────────────────────────────────────────────
  flowCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#acc9ae",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  flowRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 12 },

  // ── Form card ────────────────────────────────────────────────────────────────
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    shadowColor: "#acc9ae",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#1f2937",
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 2,
  },
  batchIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 2,
  },
  regenBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#edf8ee",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#c8e6c9",
  },
  chipsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    marginTop: 10,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipsRow: { gap: 8, paddingBottom: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  chipActive: { backgroundColor: "#2e7d32", borderColor: "#2e7d32" },
  chipText:   { fontSize: 12, fontWeight: "700", color: "#2e7d32" },
  chipTextActive: { color: "#ffffff" },

  twoCol: { flexDirection: "row", gap: 12 },
  colField: { flex: 1 },

  // ── Buttons ───────────────────────────────────────────────────────────────────
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2e7d32",
    borderRadius: 18,
    paddingVertical: 16,
    marginTop: 20,
  },
  primaryBtnDisabled: { backgroundColor: "#a7c4a7" },
  primaryBtnText: { fontSize: 16, fontWeight: "800", color: "#ffffff" },

  ghostBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 18,
    paddingVertical: 14,
    marginTop: 12,
  },
  ghostBtnText: { fontSize: 15, fontWeight: "700", color: "#475569" },

  // ── Success screen ────────────────────────────────────────────────────────────
  successCard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    shadowColor: "#acc9ae",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  successIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#edf9ef",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: { fontSize: 24, fontWeight: "800", color: "#1f2937" },
  successSub:   { marginTop: 8, fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 20 },
  detailsCard: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    padding: 16,
    marginTop: 20,
    marginBottom: 4,
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  detailValue: { fontSize: 14, fontWeight: "800", color: "#1f2937" },

  // ── QR card ───────────────────────────────────────────────────────────────────
  qrCard: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderRadius: 20,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  qrLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  qrFrame: {
    padding: 8,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#2e7d32",
    shadowColor: "#2e7d32",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  qrBatchId: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "800",
    color: "#1f2937",
    letterSpacing: 0.5,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  shareBtnText: { fontSize: 13, fontWeight: "700", color: "#2e7d32" },
});
