import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { qrApi } from "../../utils/api";

function qualityColor(q) {
  const s = (q || "").toLowerCase();
  if (s.includes("pure") || s.includes("good")) return "#2e7d32";
  if (s.includes("suspicious") || s.includes("fair")) return "#f59e0b";
  if (s.includes("adulterated") || s.includes("poor")) return "#dc2626";
  return "#64748b";
}

function safetyColor(s) {
  const value = (s || "").toLowerCase();
  if (value === "green") return "#2e7d32";
  if (value === "yellow") return "#f59e0b";
  if (value === "red") return "#dc2626";
  return "#64748b";
}

function extractBatchId(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) {
    return "";
  }

  try {
    const parsed = JSON.parse(raw);
    const candidate = parsed?.batch_id || parsed?.batchId || parsed?.id;
    if (candidate) {
      return String(candidate).trim();
    }
  } catch {
    // Fall through to URL/plain-text parsing.
  }

  try {
    const url = new URL(raw);
    const queryCandidate =
      url.searchParams.get("batch_id") ||
      url.searchParams.get("batchId") ||
      url.searchParams.get("id");

    if (queryCandidate) {
      return queryCandidate.trim();
    }

    const lastSegment = url.pathname.split("/").filter(Boolean).pop();
    if (lastSegment) {
      return decodeURIComponent(lastSegment).trim();
    }
  } catch {
    // Not a URL, treat as the batch id itself.
  }

  return raw;
}

function buildChainSteps(batch, verified) {
  const quality = (batch?.quality || batch?.quality_status || "").toLowerCase();
  const isAdulterated = quality.includes("adulterated");
  const isSuspicious = quality.includes("suspicious");
  const allGood = !isAdulterated && !isSuspicious && !!batch;

  return [
    {
      label: "Farm Collection",
      sub: batch ? `Farmer: ${batch.farmer_name || batch.farmer_id || "-"}` : "Pending",
      icon: "home",
      done: !!batch,
      color: "#2e7d32",
    },
    {
      label: "Quality Check",
      sub: batch
        ? `Fat: ${batch.fat ?? "-"}%  SNF: ${batch.snf ?? "-"}%`
        : "Pending",
      icon: "beaker",
      done: !!batch,
      color: isAdulterated ? "#dc2626" : isSuspicious ? "#f59e0b" : "#2e7d32",
    },
    {
      label: "Temperature Verified",
      sub: batch ? `${batch.temperature ?? "-"} deg C` : "Pending",
      icon: "thermometer",
      done: !!batch,
      color: "#0288d1",
    },
    {
      label: "Blockchain Logged",
      sub:
        verified === true
          ? "Tamper-proof record stored"
          : verified === false
          ? "Tamper detected"
          : "Awaiting confirmation",
      icon: "cube",
      done: verified === true,
      color: verified === true ? "#2e7d32" : verified === false ? "#dc2626" : "#94a3b8",
    },
    {
      label: "Dispatched",
      sub: allGood && verified ? "Ready for retail" : "Pending dispatch",
      icon: "car",
      done: allGood && !!verified,
      color: "#558b2f",
    },
    {
      label: "At Retailer",
      sub: allGood && verified ? "Available for consumers" : "Not yet available",
      icon: "storefront",
      done: allGood && !!verified,
      color: "#1976d2",
    },
  ];
}

function BatchResult({ result, onClear }) {
  const { batch, chain, batchId, error } = result;

  if (error) {
    return (
      <View style={[styles.resultCard, styles.errorCard]}>
        <Ionicons
          name="close-circle"
          size={36}
          color="#dc2626"
          style={{ marginBottom: 10 }}
        />
        <Text style={styles.errorTitle}>Batch Not Found</Text>
        <Text style={styles.errorSub}>{batchId}</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onClear} activeOpacity={0.85}>
          <Ionicons name="scan" size={16} color="#dc2626" />
          <Text style={[styles.retryBtnText, { color: "#dc2626" }]}>Try Another ID</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const quality = batch?.quality || batch?.quality_status || "-";
  const safety = batch?.safety_index || "-";
  const txHash = chain?.tx_hash || batch?.blockchain_tx || batch?.blockchain_tx_hash || null;
  const verified = chain?.verified ?? null;
  const steps = buildChainSteps(batch, verified);

  return (
    <ScrollView
      style={styles.resultScroll}
      contentContainerStyle={styles.resultScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.resultHeader}>
        <View style={styles.resultIconWrap}>
          <Ionicons name="checkmark-circle" size={32} color="#2e7d32" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.resultTitle}>Product Verified</Text>
          <Text style={styles.resultBatchId}>{batchId}</Text>
        </View>
      </View>

      <View style={styles.pillRow}>
        <View style={[styles.pill, { backgroundColor: `${qualityColor(quality)}22` }]}>
          <Ionicons name="beaker" size={13} color={qualityColor(quality)} />
          <Text style={[styles.pillText, { color: qualityColor(quality) }]}>{quality}</Text>
        </View>
        {safety !== "-" && (
          <View style={[styles.pill, { backgroundColor: `${safetyColor(safety)}22` }]}>
            <Ionicons name="shield-checkmark" size={13} color={safetyColor(safety)} />
            <Text style={[styles.pillText, { color: safetyColor(safety) }]}>
              {safety} Safety
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.chainTitle}>Product Journey</Text>
      <View style={styles.chainCard}>
        {steps.map((step, index) => (
          <View key={step.label} style={styles.chainStep}>
            {index > 0 && (
              <View
                style={[
                  styles.connector,
                  {
                    backgroundColor:
                      steps[index - 1].done && step.done ? "#c8e6c9" : "#e2e8f0",
                  },
                ]}
              />
            )}
            <View
              style={[
                styles.stepDot,
                { backgroundColor: step.done ? step.color : "#e2e8f0" },
              ]}
            >
              <Ionicons
                name={step.icon}
                size={16}
                color={step.done ? "#ffffff" : "#94a3b8"}
              />
            </View>
            <View style={styles.stepText}>
              <Text style={[styles.stepLabel, step.done && { color: "#1f2937" }]}>
                {step.label}
              </Text>
              <Text style={styles.stepSub}>{step.sub}</Text>
            </View>
            {step.done && <Ionicons name="checkmark-circle" size={16} color={step.color} />}
          </View>
        ))}
      </View>

      {txHash && (
        <View style={styles.hashCard}>
          <Ionicons
            name={verified ? "lock-closed" : "ellipse-outline"}
            size={16}
            color={verified ? "#2e7d32" : "#94a3b8"}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.hashLabel}>
              {verified ? "Blockchain Verified" : "No Chain Record"}
            </Text>
            <Text style={styles.hashValue} numberOfLines={1}>
              {txHash}
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.retryBtn} onPress={onClear} activeOpacity={0.85}>
        <Ionicons name="scan" size={16} color="#2e7d32" />
        <Text style={styles.retryBtnText}>Verify Another Product</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const CORNER = 26;
const THICK = 3;
const RADIUS = 6;

export default function CustomerScanner() {
  const router = useRouter();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [recents, setRecents] = useState([]);
  const [scanPaused, setScanPaused] = useState(false);
  const isHandlingScanRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        await qrApi.seedDemo();
      } catch {
        // Demo seed failures are non-fatal.
      }

      try {
        const response = await qrApi.recentBatches();
        if (response?.batches?.length) {
          setRecents(response.batches);
        }
      } catch {
        // Users can still scan or type a batch id manually.
      }
    })();
  }, []);

  const resetScanner = () => {
    isHandlingScanRef.current = false;
    setResult(null);
    setScanPaused(false);
  };

  const handleScan = async (rawId) => {
    const batchId = extractBatchId(rawId || input);
    if (!batchId) {
      setScanPaused(true);
      setResult({
        batchId: "Unknown QR",
        batch: null,
        chain: null,
        error: "This QR code does not contain a usable batch ID.",
      });
      return;
    }

    setInput(batchId);
    setScanPaused(true);
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
        error: err.message || "Batch not found.",
      });
    } finally {
      setLoading(false);
      isHandlingScanRef.current = false;
    }
  };

  const handleBarcodeScanned = ({ data }) => {
    if (loading || scanPaused || isHandlingScanRef.current) {
      return;
    }

    isHandlingScanRef.current = true;
    void handleScan(data);
  };

  const quickTaps =
    recents.length > 0
      ? recents.slice(0, 5)
      : [
          { batch_id: "MILK-530L", quality: "Pure", farmer_name: "Ravi Patil" },
          { batch_id: "MILK-DEMO1", quality: "Suspicious", farmer_name: "Sneha Jadhav" },
          { batch_id: "MILK-ARJ01", quality: "Pure", farmer_name: "Arjun Shinde" },
        ];

  const hasCameraAccess = !!cameraPermission?.granted;
  const cameraHint = loading
    ? "Verifying product chain..."
    : hasCameraAccess
    ? "Align the product QR code inside the frame"
    : "Enable camera access for live QR scanning, or enter a batch ID below.";

  return (
    <View style={styles.container}>
      <View style={styles.cameraArea}>
        {hasCameraAccess ? (
          <CameraView
            facing="back"
            style={styles.cameraFeed}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={!scanPaused && !loading ? handleBarcodeScanned : undefined}
          />
        ) : (
          <LinearGradient
            colors={["#0a2211", "#0d3b1e", "#174b2a"]}
            style={styles.cameraFeed}
          />
        )}

        <LinearGradient
          pointerEvents="none"
          colors={["rgba(0,0,0,0.18)", "rgba(0,0,0,0.42)"]}
          style={styles.cameraShade}
        />

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace("/(auth)/login")}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.brandRow}>
          <Ionicons name="leaf" size={16} color="#66bb6a" />
          <Text style={styles.brandText}>Smart Shetakari</Text>
          <View style={styles.trustBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#174b2a" />
            <Text style={styles.trustBadgeText}>Verified</Text>
          </View>
        </View>

        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {loading ? (
            <ActivityIndicator size="large" color="#7ce37c" />
          ) : !hasCameraAccess ? (
            <Ionicons name="camera-outline" size={54} color="rgba(255,255,255,0.28)" />
          ) : (
            <View style={styles.focusDot} />
          )}
        </View>

        <Text style={styles.hint}>{cameraHint}</Text>
        <Text style={styles.hintSub}>
          Powered by blockchain for tamper-resistant dairy traceability
        </Text>
      </View>

      <View style={styles.bottomSheet}>
        {result ? (
          <BatchResult result={result} onClear={resetScanner} />
        ) : (
          <>
            <Text style={styles.sheetTitle}>Verify Dairy Product</Text>
            <Text style={styles.sheetSub}>
              Scan a product QR code with your camera or enter the batch ID printed
              on the package.
            </Text>

            {!hasCameraAccess && (
              <TouchableOpacity
                style={styles.permissionCard}
                onPress={() => {
                  void requestCameraPermission();
                }}
                activeOpacity={0.85}
              >
                <View style={styles.permissionIcon}>
                  <Ionicons name="camera-outline" size={18} color="#2e7d32" />
                </View>
                <View style={styles.permissionTextWrap}>
                  <Text style={styles.permissionTitle}>Enable camera scanning</Text>
                  <Text style={styles.permissionText}>
                    Allow camera access to scan QR codes instantly.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#2e7d32" />
              </TouchableOpacity>
            )}

            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                value={input}
                onChangeText={setInput}
                placeholder="e.g. MILK-530L"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                returnKeyType="search"
                onSubmitEditing={() => {
                  isHandlingScanRef.current = false;
                  void handleScan(input);
                }}
              />
              <TouchableOpacity
                style={[styles.searchBtn, (!input.trim() || loading) && styles.searchBtnOff]}
                onPress={() => {
                  isHandlingScanRef.current = false;
                  void handleScan(input);
                }}
                disabled={!input.trim() || loading}
                activeOpacity={0.85}
              >
                <Ionicons name="search" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sampleLabel}>
              {recents.length > 0 ? "Recent batches" : "Demo batches"}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sampleRow}
            >
              {quickTaps.map((batch) => (
                <TouchableOpacity
                  key={batch.batch_id}
                  style={[
                    styles.sampleBtn,
                    { borderLeftColor: qualityColor(batch.quality), borderLeftWidth: 3 },
                  ]}
                  onPress={() => {
                    isHandlingScanRef.current = false;
                    void handleScan(batch.batch_id);
                  }}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <Ionicons name="qr-code" size={14} color="#2e7d32" />
                  <View>
                    <Text style={styles.sampleId}>{batch.batch_id}</Text>
                    {(batch.farmer_name || batch.farmer_id) && (
                      <Text style={styles.sampleFarmer}>
                        {batch.farmer_name || batch.farmer_id}
                      </Text>
                    )}
                    {batch.quality && (
                      <Text
                        style={[styles.sampleQuality, { color: qualityColor(batch.quality) }]}
                      >
                        {batch.quality}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d2b17" },
  cameraArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 24,
    overflow: "hidden",
  },
  cameraFeed: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraShade: {
    ...StyleSheet.absoluteFillObject,
  },
  backBtn: {
    position: "absolute",
    top: 52,
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 28,
  },
  brandText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.88)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 6,
  },
  trustBadgeText: { fontSize: 10, fontWeight: "800", color: "#174b2a" },
  scanFrame: {
    width: "72%",
    aspectRatio: 1,
    maxHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
    borderColor: "#7ce37c",
    borderWidth: THICK,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: RADIUS,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: RADIUS,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: RADIUS,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: RADIUS,
  },
  focusDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(124,227,124,0.35)",
    borderWidth: 2,
    borderColor: "#7ce37c",
  },
  hint: {
    marginTop: 20,
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    textAlign: "center",
    maxWidth: 300,
    fontWeight: "600",
  },
  hintSub: {
    marginTop: 6,
    color: "rgba(165,214,167,0.72)",
    fontSize: 11,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  bottomSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
    minHeight: 300,
  },
  sheetTitle: { fontSize: 22, fontWeight: "800", color: "#1f2937" },
  sheetSub: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748b",
    lineHeight: 19,
    marginBottom: 4,
  },
  permissionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#edf8ee",
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    gap: 10,
  },
  permissionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionTextWrap: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1f2937",
  },
  permissionText: {
    marginTop: 2,
    fontSize: 12,
    color: "#4b5563",
    lineHeight: 17,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 10,
  },
  textInput: {
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
  searchBtnOff: { backgroundColor: "#a7c4a7" },
  sampleLabel: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 11,
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
  sampleId: { fontSize: 13, fontWeight: "800", color: "#1f2937" },
  sampleFarmer: { fontSize: 11, fontWeight: "600", color: "#64748b", marginTop: 1 },
  sampleQuality: { fontSize: 11, fontWeight: "600", marginTop: 1 },
  resultScroll: { maxHeight: 440 },
  resultScrollContent: { paddingBottom: 4 },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  resultIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#edf8ee",
    alignItems: "center",
    justifyContent: "center",
  },
  resultTitle: { fontSize: 18, fontWeight: "800", color: "#1f2937" },
  resultBatchId: { fontSize: 13, color: "#64748b", fontWeight: "700", marginTop: 2 },
  pillRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 14 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  pillText: { fontSize: 13, fontWeight: "800" },
  chainTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  chainCard: {
    backgroundColor: "#f8faf8",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
    gap: 14,
  },
  chainStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    position: "relative",
  },
  connector: {
    position: "absolute",
    left: 18,
    top: -14,
    width: 2,
    height: 14,
  },
  stepDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepText: { flex: 1 },
  stepLabel: { fontSize: 14, fontWeight: "800", color: "#94a3b8" },
  stepSub: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  hashCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  hashLabel: { fontSize: 12, fontWeight: "700", color: "#475569" },
  hashValue: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#edf8ee",
    borderRadius: 14,
    paddingVertical: 12,
  },
  retryBtnText: { fontSize: 14, fontWeight: "800", color: "#2e7d32" },
  resultCard: {
    backgroundColor: "#f8faf8",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#dce8dc",
  },
  errorCard: {
    backgroundColor: "#fff5f5",
    borderColor: "#fecaca",
    alignItems: "center",
  },
  errorTitle: { fontSize: 18, fontWeight: "800", color: "#dc2626", marginBottom: 4 },
  errorSub: { fontSize: 13, color: "#94a3b8", fontWeight: "700", marginBottom: 10 },
  errorMsg: {
    fontSize: 13,
    color: "#dc2626",
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 16,
  },
});
