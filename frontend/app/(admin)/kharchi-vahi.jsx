import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { speakText, stopSpeaking } from "../../components/tts-service";
import { getStoredUser, hackathonApi } from "../../utils/api";

let ExpoSpeechRecognition = null;
try {
  ExpoSpeechRecognition = require("expo-speech-recognition").ExpoSpeechRecognitionModule;
} catch (_) {}

const CATEGORIES = [
  { key: "feed", label: "चारा", labelEn: "Feed", icon: "leaf", color: "#2e7d32" },
  { key: "veterinary", label: "पशुवैद्य", labelEn: "Veterinary", icon: "medkit", color: "#e53935" },
  { key: "labor", label: "मजूर", labelEn: "Labor", icon: "people", color: "#f57c00" },
  { key: "electricity", label: "वीज", labelEn: "Electricity", icon: "flash", color: "#fbc02d" },
  { key: "transport", label: "वाहतूक", labelEn: "Transport", icon: "car", color: "#0288d1" },
  { key: "miscellaneous", label: "इतर", labelEn: "Other", icon: "grid", color: "#64748b" },
];

function getCategoryInfo(categoryKey) {
  return CATEGORIES.find((category) => category.key === categoryKey) || CATEGORIES[5];
}

export default function KharchiVahi() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listenerRefs = useRef([]);

  const [profile, setProfile] = useState(null);
  const [farmerId, setFarmerId] = useState("");
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("feed");
  const [inputMode, setInputMode] = useState("text");

  const [recording, setRecording] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [lastConfirm, setLastConfirm] = useState("");
  const [lastParsed, setLastParsed] = useState(null);

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const user = await getStoredUser();
        if (!mounted || !user) {
          return;
        }

        const resolvedFarmerId = user?.user_id || user?.email || "";
        setProfile(user);
        setFarmerId(resolvedFarmerId);
        await loadExpenses(resolvedFarmerId);
      } finally {
        if (mounted) {
          setDataLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
      cleanupRecognitionListeners();
      void stopSpeaking();
    };
  }, []);

  function cleanupRecognitionListeners() {
    listenerRefs.current.forEach((listener) => {
      try {
        listener?.remove?.();
      } catch {}
    });
    listenerRefs.current = [];
  }

  async function loadExpenses(targetFarmerId = farmerId) {
    if (!targetFarmerId) {
      return;
    }

    setDataLoading(true);
    try {
      const response = await hackathonApi.getExpenses(targetFarmerId);
      setExpenses(response?.expenses || []);
      setSummary(response?.summary || null);
    } catch {
      // Leave the last known state in place if fetch fails.
    } finally {
      setDataLoading(false);
    }
  }

  async function startVoice() {
    if (!ExpoSpeechRecognition) {
      setLastConfirm("Voice recognition is unavailable on this device. You can still type the expense note.");
      return;
    }

    if (recording) {
      try {
        ExpoSpeechRecognition.stop?.();
      } catch {}
      setRecording(false);
      cleanupRecognitionListeners();
      return;
    }

    try {
      cleanupRecognitionListeners();
      await ExpoSpeechRecognition.requestPermissionsAsync();
      setRecording(true);

      listenerRefs.current = [
        ExpoSpeechRecognition.addListener("onresult", (event) => {
          const transcript =
            event?.results?.[0]?.transcript ||
            event?.transcript ||
            "";

          if (transcript) {
            setText(transcript);
            setInputMode("speech");
          }

          setRecording(false);
          cleanupRecognitionListeners();
        }),
        ExpoSpeechRecognition.addListener("onerror", () => {
          setRecording(false);
          cleanupRecognitionListeners();
        }),
      ];

      ExpoSpeechRecognition.start?.({
        lang: "mr-IN",
        continuous: false,
        interimResults: false,
      });
    } catch {
      setRecording(false);
      cleanupRecognitionListeners();
      setLastConfirm("Could not start Marathi speech-to-text on this device.");
    }
  }

  async function saveExpense() {
    if (!farmerId) {
      setLastConfirm("Farmer profile not loaded yet. Please wait or re-login.");
      return;
    }
    if (!text.trim()) {
      setLastConfirm("Please describe the expense first — by voice or typing.");
      return;
    }

    setSaveLoading(true);
    setLastConfirm("");
    setLastParsed(null);

    try {
      const response = await hackathonApi.addExpense({
        farmer_id: farmerId,
        text: text.trim(),
        amount: amount ? parseFloat(amount) : null,
        category,
        source: inputMode,
      });

      if (response?.status === "error") {
        setLastConfirm(response.message || "Could not save expense. Please include the amount.");
        return;
      }

      const confirmMsg = response?.marathi_confirm || "खर्च नोंदवला.";
      setLastConfirm(confirmMsg);
      setLastParsed(response?.parsed || null);
      await speakText(confirmMsg, "mr");

      setText("");
      setAmount("");
      setInputMode("text");
      await loadExpenses(farmerId);
    } catch (requestError) {
      setLastConfirm(requestError.message || "Expense could not be saved.");
      setLastParsed(null);
    } finally {
      setSaveLoading(false);
    }
  }

  const totalExpenses = summary?.total_expenses || 0;
  const confirmIsError =
    lastConfirm &&
    (lastConfirm.toLowerCase().includes("could not") ||
      lastConfirm.toLowerCase().includes("not loaded") ||
      lastConfirm.toLowerCase().includes("please") ||
      lastConfirm.toLowerCase().includes("amount"));

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#2e7d32" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>KharchiVahi</Text>
            <Text style={styles.subtitle}>Voice-first expense notebook for farmers</Text>
          </View>
          <Ionicons name="mic" size={28} color="#2e7d32" />
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileBadge}>
            <Ionicons name="person" size={16} color="#fff" />
            <Text style={styles.profileBadgeText}>Farmer View</Text>
          </View>
          <Text style={styles.profileName}>{profile?.name || "Farmer"}</Text>
          <Text style={styles.profileMeta}>
            {profile?.farm_name || profile?.village || profile?.location || "Expense record linked to your farmer profile"}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Record Expense</Text>

          <TouchableOpacity
            style={[styles.voiceBtn, recording && styles.voiceBtnActive]}
            onPress={startVoice}
          >
            <Ionicons name={recording ? "stop-circle" : "mic"} size={26} color="#fff" />
            <Text style={styles.voiceBtnText}>
              {recording ? "Listening..." : "Speak in Marathi"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.helperText}>
            Example: "चारा साठी पाचशे रुपये" or "vet medicine 1200"
          </Text>

          <TextInput
            style={styles.textArea}
            value={text}
            onChangeText={(value) => {
              setText(value);
              setInputMode("text");
            }}
            placeholder="Describe the expense by speech or typing"
            placeholderTextColor="#94a3b8"
            multiline
          />

          <Text style={styles.sectionLabel}>Optional amount override</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="Leave empty if the spoken note already includes the amount"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
          />

          <Text style={styles.sectionLabel}>Optional category override</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.catRow}>
              {CATEGORIES.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => setCategory(item.key)}
                  style={[
                    styles.catChip,
                    { borderColor: item.color },
                    category === item.key && { backgroundColor: item.color },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={14}
                    color={category === item.key ? "#fff" : item.color}
                  />
                  <Text
                    style={[
                      styles.catChipText,
                      { color: category === item.key ? "#fff" : item.color },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.saveBtn} onPress={saveExpense} disabled={saveLoading}>
            {saveLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="save" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Add Expense</Text>
              </>
            )}
          </TouchableOpacity>

          {lastConfirm ? (
            <View style={[styles.confirmBox, confirmIsError && styles.confirmBoxError]}>
              <Ionicons
                name={confirmIsError ? "alert-circle" : "checkmark-circle"}
                size={16}
                color={confirmIsError ? "#b91c1c" : "#2e7d32"}
              />
              <Text style={[styles.confirmText, confirmIsError && styles.confirmTextError]}>
                {lastConfirm}
              </Text>
            </View>
          ) : null}

          {lastParsed ? (
            <View style={styles.parsedCard}>
              <Text style={styles.parsedTitle}>AI understood</Text>
              <Text style={styles.parsedText}>{lastParsed.normalized_text}</Text>
              <Text style={styles.parsedMeta}>
                Amount: Rs {lastParsed.amount} | Category: {getCategoryInfo(lastParsed.category).labelEn}
              </Text>
            </View>
          ) : null}
        </View>

        {summary ? (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Farm P&L Snapshot</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>Rs {Math.round(summary.total_income || 0)}</Text>
                  <Text style={[styles.summaryLabel, { color: "#86efac" }]}>Income</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>Rs {Math.round(summary.total_expenses || 0)}</Text>
                  <Text style={[styles.summaryLabel, { color: "#fecaca" }]}>Expenses</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>Rs {Math.round(Math.abs(summary.net_profit || 0))}</Text>
                  <Text style={[styles.summaryLabel, { color: summary.net_profit >= 0 ? "#86efac" : "#fecaca" }]}>
                    {summary.net_profit >= 0 ? "Profit" : "Loss"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Expense Breakdown</Text>
              {CATEGORIES.map((item) => {
                const amountValue = summary.by_category?.[item.key] || 0;
                if (!amountValue) {
                  return null;
                }

                const pct = totalExpenses > 0 ? (amountValue / totalExpenses) * 100 : 0;

                return (
                  <View key={item.key} style={styles.breakdownRow}>
                    <View style={[styles.breakdownDot, { backgroundColor: item.color }]} />
                    <Text style={styles.breakdownLabel}>{item.labelEn}</Text>
                    <View style={styles.breakdownTrack}>
                      <View
                        style={[
                          styles.breakdownFill,
                          { width: `${pct}%`, backgroundColor: item.color },
                        ]}
                      />
                    </View>
                    <Text style={[styles.breakdownAmount, { color: item.color }]}>
                      Rs {Math.round(amountValue)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        <View style={styles.card}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Recent Expenses</Text>
            <TouchableOpacity onPress={() => loadExpenses(farmerId)} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={16} color="#2e7d32" />
            </TouchableOpacity>
          </View>

          {dataLoading ? (
            <ActivityIndicator color="#2e7d32" style={{ marginVertical: 20 }} />
          ) : expenses.length === 0 ? (
            <Text style={styles.emptyText}>
              No expenses recorded yet. Speak or type one above to get started.
            </Text>
          ) : (
            expenses.slice(0, 15).map((expense, index) => {
              const categoryInfo = getCategoryInfo(expense.category);
              return (
                <View key={expense._id || index} style={styles.expenseRow}>
                  <View style={[styles.expenseIcon, { backgroundColor: `${categoryInfo.color}22` }]}>
                    <Ionicons name={categoryInfo.icon} size={16} color={categoryInfo.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expenseText} numberOfLines={1}>
                      {expense.text}
                    </Text>
                    <Text style={styles.expenseMeta}>
                      {categoryInfo.label} | {expense.date}
                    </Text>
                  </View>
                  <Text style={[styles.expenseAmount, { color: categoryInfo.color }]}>
                    Rs {Math.round(expense.amount || 0)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f0fff4" },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, marginLeft: 10 },
  title: { fontSize: 24, fontWeight: "900", color: "#1b5e20" },
  subtitle: { fontSize: 13, color: "#546e7a", marginTop: 2 },
  profileCard: { backgroundColor: "#1b5e20", borderRadius: 22, padding: 18, marginBottom: 12 },
  profileBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  profileBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800", marginLeft: 6 },
  profileName: { marginTop: 14, fontSize: 24, fontWeight: "900", color: "#fff" },
  profileMeta: { marginTop: 5, fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 19 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 16, marginBottom: 12 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#546e7a", marginBottom: 8 },
  voiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2e7d32",
    borderRadius: 16,
    padding: 16,
  },
  voiceBtnActive: { backgroundColor: "#e53935" },
  voiceBtnText: { color: "#fff", fontSize: 16, fontWeight: "900", marginLeft: 10 },
  helperText: { marginTop: 10, marginBottom: 10, fontSize: 12, color: "#64748b", lineHeight: 18 },
  textArea: {
    backgroundColor: "#f0fff4",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#1e293b",
    minHeight: 70,
    marginBottom: 12,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#a5d6a7",
  },
  input: {
    backgroundColor: "#f0fff4",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#1e293b",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#a5d6a7",
  },
  catRow: { flexDirection: "row", marginBottom: 14 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    marginRight: 8,
  },
  catChipText: { fontSize: 13, fontWeight: "700", marginLeft: 5 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2e7d32",
    borderRadius: 14,
    padding: 14,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "800", marginLeft: 8 },
  confirmBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  confirmBoxError: { backgroundColor: "#fee2e2" },
  confirmText: { flex: 1, fontSize: 13, color: "#2e7d32", marginLeft: 8 },
  confirmTextError: { color: "#b91c1c" },
  parsedCard: { backgroundColor: "#f0fff4", borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1, borderColor: "#bbf7d0" },
  parsedTitle: { fontSize: 13, fontWeight: "800", color: "#166534" },
  parsedText: { marginTop: 4, fontSize: 14, color: "#1f2937", fontWeight: "700" },
  parsedMeta: { marginTop: 4, fontSize: 12, color: "#64748b" },
  summaryCard: { backgroundColor: "#1b5e20", borderRadius: 20, padding: 18, marginBottom: 12 },
  summaryTitle: { color: "#fff", fontSize: 16, fontWeight: "900", marginBottom: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { color: "#fff", fontSize: 17, fontWeight: "900", textAlign: "center" },
  summaryLabel: { marginTop: 4, fontSize: 11, fontWeight: "700" },
  breakdownRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  breakdownDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  breakdownLabel: { width: 82, fontSize: 12, fontWeight: "700", color: "#374151" },
  breakdownTrack: { flex: 1, height: 8, backgroundColor: "#e2e8f0", borderRadius: 999, overflow: "hidden" },
  breakdownFill: { height: "100%", borderRadius: 999 },
  breakdownAmount: { width: 74, textAlign: "right", fontSize: 12, fontWeight: "800" },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  listTitle: { fontSize: 16, fontWeight: "900", color: "#1f2937" },
  refreshBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#e8f5e9", alignItems: "center", justifyContent: "center" },
  expenseRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  expenseIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 10 },
  expenseText: { fontSize: 13, fontWeight: "700", color: "#1e293b" },
  expenseMeta: { fontSize: 11, color: "#64748b", marginTop: 2 },
  expenseAmount: { fontSize: 15, fontWeight: "900" },
  emptyText: { color: "#64748b", fontSize: 13, textAlign: "center", paddingVertical: 16 },
});
