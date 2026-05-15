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
import { qrApi } from "../../../utils/api";

function qualityColor(q) {
  const s = (q || "").toLowerCase();
  if (s.includes("pure") || s.includes("good")) return "#2e7d32";
  if (s.includes("suspicious") || s.includes("fair")) return "#f59e0b";
  if (s.includes("adulterated") || s.includes("poor")) return "#dc2626";
  return "#64748b";
}

function safetyColor(s) {
  const v = (s || "").toLowerCase();
  if (v === "green") return "#2e7d32";
  if (v === "yellow") return "#f59e0b";
  if (v === "red") return "#dc2626";
  return "#64748b";
}

function DetailCell({ icon, label, value }) {
  return (
    <View style={styles.detailCell}>
      <Ionicons name={icon} size={16} color="#64748b" />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function ResultCard({ result, onClear }) {
  const { batch, chain, batchId, error } = result;

  if (error) {
    return (
      <View style={[styles.resultCard, styles.errorCard]}>
        <View style={styles.resultIconRow}>
          <View style={[styles.resultIcon, { backgroundColor: "#fee2e2" }]}>
            <Ionicons name="close-circle" size={28} color="#dc2626" />
          </View>
          <View style={styles.resultTitleBlock}>
            <Text style={styles.resultTitle}>Batch Not Found</Text>
            <Text style={styles.resultBatchId}>{batchId}</Text>
          </View>
        </View>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
          <Ionicons name="scan" size={16} color="#dc2626" />
          <Text style={[styles.clearBtnText, { color: "#dc2626" }]}>Try Another</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const quality = batch?.quality || batch?.quality_status || "—";
  const safety = batch?.safety_index || "—";
  const farmer = batch?.farmer_name || batch?.farmer_id || batch?.farmerId || "—";
  const fat = batch?.fat != null ? `${batch.fat}%` : "—";
  const snf = batch?.snf != null ? `${batch.snf}%` : "—";
  const temp = batch?.temperature != null ? `${batch.temperature} °C` : "—";
  const txHash = chain?.tx_hash || batch?.blockchain_tx || batch?.blockchain_tx_hash || null;
  const verified = chain?.verified ?? null;
  const scannedAt = new Date().toLocaleTimeString();

  return (
    <ScrollView
      style={styles.resultScroll}
      contentContainerStyle={styles.resultScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.resultCard}>
        {/* Header */}
        <View style={styles.resultIconRow}>
          <View style={[styles.resultIcon, { backgroundColor: "#edf8ee" }]}>
            <Ionicons name="checkmark-circle" size={28} color="#2e7d32" />
          </View>
          <View style={styles.resultTitleBlock}>
            <Text style={styles.resultTitle}>Batch Verified</Text>
            <Text style={styles.resultBatchId}>{batchId}</Text>
          </View>
          <Text style={styles.scanTime}>{scannedAt}</Text>
        </View>

        {/* Quality + Safety pills */}
        <View style={styles.pillRow}>
          <View style={[styles.qualityPill, { backgroundColor: qualityColor(quality) + "22" }]}>
            <Ionicons name="beaker" size={14} color={qualityColor(quality)} />
            <Text style={[styles.pillText, { color: qualityColor(quality) }]}>{quality}</Text>
          </View>
          {safety !== "—" && (
            <View style={[styles.qualityPill, { backgroundColor: safetyColor(safety) + "22" }]}>
              <Ionicons name="shield-checkmark" size={14} color={safetyColor(safety)} />
              <Text style={[styles.pillText, { color: safetyColor(safety) }]}>{safety} Safety</Text>
            </View>
          )}
        </View>

        {/* Data grid */}
        <View style={styles.detailGrid}>
          <DetailCell icon="person-outline"      label="Farmer"       value={farmer} />
          <DetailCell icon="thermometer-outline" label="Temperature"  value={temp}   />
          <DetailCell icon="water-outline"       label="Fat %"        value={fat}    />
          <DetailCell icon="analytics-outline"   label="SNF %"        value={snf}    />
        </View>

        {/* Blockchain status */}
        <View style={styles.chainRow}>
          <Ionicons
            name={
              verified === true
                ? "lock-closed"
                : verified === false
                ? "warning"
                : "ellipse-outline"
            }
            size={16}
            color={
              verified === true ? "#2e7d32" : verified === false ? "#dc2626" : "#94a3b8"
            }
          />
          <Text style={styles.chainLabel}>
            {verified === true
              ? "Blockchain Verified"
              : verified === false
              ? "Tamper Detected"
              : "No Chain Record"}
          </Text>
          {txHash && (
            <Text style={styles.txHash} numberOfLines={1}>
              {txHash.slice(0, 16)}…
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
          <Ionicons name="scan" size={16} color="#2e7d32" />
          <Text style={styles.clearBtnText}>Scan Another</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default function QrScanner() {
  const router = useRouter();
  const [manualInput, setManualInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [recentBatches, setRecentBatches] = useState([]);

  // Seed demo batches and load recent IDs on mount
  useEffect(() => {
    (async () => {
      try {
        await qrApi.seedDemo();
      } catch {
        // seed errors are non-fatal
      }
      try {
        const res = await qrApi.recentBatches();
        if (res?.batches?.length) {
          setRecentBatches(res.batches);
        }
      } catch {
        // fall back to empty — user can type manually
      }
    })();
  }, []);

  const handleScan = async (rawId) => {
    const batchId = (rawId || manualInput).trim();
    if (!batchId) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await qrApi.scan(batchId);
      setResult({
        batchId,
        batch: response?.batch || null,
        chain: response?.chain || null,
        error: null,
      });
    } catch (err) {
      setResult({
        batchId,
        batch: null,
        chain: null,
        error: err.message || "Batch not found. Check the ID and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Quick-tap buttons: prefer real DB batches, fall back to demo IDs
  const quickTaps =
    recentBatches.length > 0
      ? recentBatches.slice(0, 5)
      : [
          { batch_id: "MILK-530L",  quality: "Pure",        farmer_name: "Ravi Patil"    },
          { batch_id: "MILK-DEMO1", quality: "Suspicious",  farmer_name: "Sneha Jadhav"  },
          { batch_id: "MILK-ARJ01", quality: "Pure",        farmer_name: "Arjun Shinde"  },
          { batch_id: "MILK-MEE02", quality: "Adulterated", farmer_name: "Meena More"    },
          { batch_id: "MILK-VIK03", quality: "Pure",        farmer_name: "Vikram Desai"  },
        ];

  return (
    <View style={styles.container}>
      {/* Dark camera area */}
      <View style={styles.cameraArea}>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          {loading ? (
            <ActivityIndicator size="large" color="#7ce37c" />
          ) : (
            <Ionicons
              name="qr-code-outline"
              size={64}
              color="rgba(255,255,255,0.2)"
            />
          )}
        </View>
        <Text style={styles.cameraHint}>
          {loading ? "Looking up batch…" : "Enter a batch ID or tap one below"}
        </Text>
      </View>

      {/* Back button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backBtn}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={20} color="#ffffff" />
      </TouchableOpacity>

      {/* Bottom sheet */}
      <View style={styles.bottomSheet}>
        {result ? (
          <ResultCard result={result} onClear={() => setResult(null)} />
        ) : (
          <>
            <Text style={styles.sheetTitle}>Scan a Milk Batch</Text>
            <Text style={styles.sheetSub}>
              Type a batch ID or tap a recent batch below to look it up from the backend.
            </Text>

            {/* Manual input */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={manualInput}
                onChangeText={setManualInput}
                placeholder="e.g. MILK-530L"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                returnKeyType="search"
                onSubmitEditing={() => handleScan(manualInput)}
              />
              <TouchableOpacity
                style={[
                  styles.searchBtn,
                  (!manualInput.trim() || loading) && styles.searchBtnDisabled,
                ]}
                onPress={() => handleScan(manualInput)}
                disabled={!manualInput.trim() || loading}
                activeOpacity={0.85}
              >
                <Ionicons name="search" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Quick-tap batches */}
            <Text style={styles.sampleLabel}>
              {recentBatches.length > 0 ? "Recent batches" : "Demo batches"}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sampleRow}
            >
              {quickTaps.map((b) => (
                <TouchableOpacity
                  key={b.batch_id}
                  style={[
                    styles.sampleBtn,
                    { borderLeftColor: qualityColor(b.quality), borderLeftWidth: 3 },
                  ]}
                  onPress={() => handleScan(b.batch_id)}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <Ionicons name="qr-code" size={14} color="#2e7d32" />
                  <View>
                    <Text style={styles.sampleBtnId}>{b.batch_id}</Text>
                    {(b.farmer_name || b.farmer_id) && b.farmer_name !== "—" && (
                      <Text style={styles.sampleBtnFarmer}>
                        {b.farmer_name || b.farmer_id}
                      </Text>
                    )}
                    {b.quality && b.quality !== "—" && (
                      <Text style={[styles.sampleBtnQuality, { color: qualityColor(b.quality) }]}>
                        {b.quality}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    </View>
  );
}

const CORNER_SIZE = 26;
const CORNER_THICK = 3;
const CORNER_RADIUS = 6;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d2b17" },

  cameraArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  backBtn: {
    position: "absolute",
    top: 52,
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },

  scanFrame: {
    width: "76%",
    aspectRatio: 1,
    maxHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: "#7ce37c",
    borderWidth: CORNER_THICK,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: CORNER_RADIUS },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: CORNER_RADIUS },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: CORNER_RADIUS },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: CORNER_RADIUS },

  cameraHint: {
    marginTop: 24,
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    textAlign: "center",
    maxWidth: 280,
  },

  bottomSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
    minHeight: 280,
  },
  sheetTitle: { fontSize: 22, fontWeight: "800", color: "#1f2937" },
  sheetSub: { marginTop: 6, fontSize: 14, color: "#64748b", lineHeight: 20 },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 10,
  },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#1f2937",
    fontWeight: "700",
  },
  searchBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#2e7d32",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnDisabled: { backgroundColor: "#a7c4a7" },

  sampleLabel: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: "800",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sampleRow: { gap: 10, paddingBottom: 2 },
  sampleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8faf8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sampleBtnId: { fontSize: 13, fontWeight: "800", color: "#1f2937" },
  sampleBtnFarmer: { fontSize: 11, fontWeight: "600", color: "#64748b", marginTop: 1 },
  sampleBtnQuality: { fontSize: 11, fontWeight: "600", marginTop: 1 },

  // ── Result card ──────────────────────────────
  resultScroll: { maxHeight: 400 },
  resultScrollContent: { paddingBottom: 4 },

  resultCard: {
    backgroundColor: "#f8faf8",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d4ebd4",
  },
  errorCard: { backgroundColor: "#fff5f5", borderColor: "#fecaca" },

  resultIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  resultIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  resultTitleBlock: { flex: 1 },
  resultTitle: { fontSize: 17, fontWeight: "800", color: "#1f2937" },
  resultBatchId: { fontSize: 13, color: "#64748b", marginTop: 2, fontWeight: "700" },
  scanTime: { fontSize: 12, color: "#94a3b8" },

  pillRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 14 },
  qualityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  pillText: { fontSize: 13, fontWeight: "800" },

  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  detailCell: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    width: "47%",
    gap: 4,
    shadowColor: "#c0d4c0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  detailLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "600" },
  detailValue: { fontSize: 16, fontWeight: "800", color: "#1f2937" },

  chainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  chainLabel: { fontSize: 13, fontWeight: "700", color: "#475569" },
  txHash: { flex: 1, fontSize: 11, color: "#94a3b8", textAlign: "right" },

  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#edf8ee",
    borderRadius: 14,
    paddingVertical: 12,
  },
  clearBtnText: { fontSize: 14, fontWeight: "800", color: "#2e7d32" },

  errorText: { fontSize: 13, lineHeight: 19, color: "#dc2626", marginBottom: 14 },
});
