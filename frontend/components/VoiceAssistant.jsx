/**
 * VoiceAssistant.jsx
 * ──────────────────
 * Full wake-word → record → send → TTS → reset loop.
 *
 * State machine:
 *   IDLE        → wake word detected → LISTENING
 *   LISTENING   → recording done     → PROCESSING
 *   PROCESSING  → response received  → RESPONDING
 *   RESPONDING  → TTS done           → IDLE
 *
 * Wake word detection:
 *   Uses the model.tflite in assets/voice_model/ via expo-av audio
 *   sampling + a lightweight JS MFCC approach.
 *   The .tflite model was trained for "Namskar DairyMitra".
 *
 * NOTE: TFLite inference in React Native requires react-native-fast-tflite
 *       (a dev-build package). Until that's wired up, we expose a
 *       simulateWakeWord() helper so you can test the full flow instantly.
 */

import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Speech from "expo-speech";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { getStoredUser, voiceApi } from "../utils/api";

// ─── Constants ───────────────────────────────────────────────────────────────
const STATE = {
  IDLE: "IDLE",
  LISTENING: "LISTENING",
  PROCESSING: "PROCESSING",
  RESPONDING: "RESPONDING",
};

const STATE_CONFIG = {
  [STATE.IDLE]: {
    label: "नमस्कार DairyMitra म्हणा",
    sublabel: 'Say "Namskar DairyMitra" to activate',
    icon: "mic-outline",
    gradientColors: ["#0f5f43", "#188463"],
    ringColor: "#2e7d32",
  },
  [STATE.LISTENING]: {
    label: "🎤 बोलिए...",
    sublabel: "Listening — speak your expense or question",
    icon: "mic",
    gradientColors: ["#1565c0", "#0d47a1"],
    ringColor: "#1976d2",
  },
  [STATE.PROCESSING]: {
    label: "⚡ सोच रहा हूँ...",
    sublabel: "Sending to DairyMitra AI...",
    icon: "cloud-upload-outline",
    gradientColors: ["#6a1b9a", "#4a148c"],
    ringColor: "#7b1fa2",
  },
  [STATE.RESPONDING]: {
    label: "✅ उत्तर",
    sublabel: "DairyMitra is speaking...",
    icon: "volume-high-outline",
    gradientColors: ["#e65100", "#bf360c"],
    ringColor: "#f57c00",
  },
};

// Recording settings — 16 kHz mono WAV (optimal for Whisper STT)
const RECORDING_OPTIONS = {
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: ".m4a",
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 64000,
  },
};

const MAX_RECORD_MS = 6000;   // stop recording after 6 s
const COOLDOWN_MS = 2000;     // wait 2 s before re-enabling wake word

// ─── Component ───────────────────────────────────────────────────────────────
/**
 * Props:
 *   visible        {boolean}   — show/hide the assistant overlay
 *   onClose        {function}  — called when user dismisses
 *   farmerId       {string}    — auto-read from storage if not provided
 */
export default function VoiceAssistant({ visible = false, onClose }) {
  const [appState, setAppState] = useState(STATE.IDLE);
  const [response, setResponse] = useState("");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [isExpense, setIsExpense] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState(null);
  const [farmerId, setFarmerId] = useState("");

  // Refs to avoid stale closures
  const recordingRef = useRef(null);
  const isWakeActiveRef = useRef(true);
  const recordTimerRef = useRef(null);
  const cooldownTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // ── Load farmer ID from storage ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const user = await getStoredUser();
        if (user) {
          setFarmerId(user.user_id || user.email || "");
        }
      } catch {}
    })();
  }, []);

  // ── Appear animation ─────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // ── Pulse animation ───────────────────────────────────────────────────────
  useEffect(() => {
    let anim;
    if (appState === STATE.LISTENING) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.22,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => anim?.stop();
  }, [appState]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimeout(recordTimerRef.current);
      clearTimeout(cooldownTimerRef.current);
      void stopRecordingIfActive();
      Speech.stop();
    };
  }, []);

  // ── State helpers ────────────────────────────────────────────────────────
  function safeSetState(next) {
    if (isMountedRef.current) setAppState(next);
  }

  async function stopRecordingIfActive() {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  WAKE WORD MOCK
  //  ─────────────────────────────────────────────────────────────────────────
  //  The actual TFLite inference loop runs natively.  This function is called
  //  by your native module (or the test button below) when the wake word fires.
  // ─────────────────────────────────────────────────────────────────────────
  const onWakeWordDetected = useCallback(() => {
    if (!isWakeActiveRef.current) return;
    if (appState !== STATE.IDLE) return;

    isWakeActiveRef.current = false;  // prevent double-trigger

    // Haptic + begin flow
    if (Platform.OS !== "web") Vibration.vibrate(60);
    void startAssistantFlow();
  }, [appState]);

  // ─────────────────────────────────────────────────────────────────────────
  //  ASSISTANT FLOW
  // ─────────────────────────────────────────────────────────────────────────
  async function startAssistantFlow() {
    setError("");
    setResponse("");
    setTranscript("");
    setIsExpense(false);
    setExpenseAmount(null);

    // 1️⃣  LISTENING — request mic permission + start recording
    safeSetState(STATE.LISTENING);

    let audioUri = null;

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        setError("Microphone permission denied.");
        resetToIdle();
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
      recordingRef.current = recording;

      // Auto-stop after MAX_RECORD_MS
      recordTimerRef.current = setTimeout(async () => {
        if (recordingRef.current) {
          await finaliseRecording();
        }
      }, MAX_RECORD_MS);
    } catch (err) {
      setError("Could not start recording: " + (err?.message || "unknown error"));
      resetToIdle();
      return;
    }

    // finaliseRecording is called by the timer above
  }

  async function finaliseRecording() {
    clearTimeout(recordTimerRef.current);

    let uri = null;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      uri = recordingRef.current.getURI();
      recordingRef.current = null;
    } catch (err) {
      setError("Recording failed: " + (err?.message || ""));
      resetToIdle();
      return;
    }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    if (!uri) {
      setError("No audio captured.");
      resetToIdle();
      return;
    }

    // 2️⃣  PROCESSING — send to backend
    safeSetState(STATE.PROCESSING);
    await sendAudioToBackend(uri);
  }

  async function sendAudioToBackend(uri) {
    try {
      // Read as base64 then convert to blob-like FormData
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Build FormData with the audio file
      const formData = new FormData();
      const filename = uri.split("/").pop() || "audio.m4a";
      formData.append("file", {
        uri,
        name: filename,
        type: "audio/m4a",
      });
      formData.append("farmer_id", farmerId);

      const result = await voiceApi.query(formData);

      if (!isMountedRef.current) return;

      // 3️⃣  RESPONDING
      safeSetState(STATE.RESPONDING);
      setTranscript(result.transcript || "");
      setResponse(result.response || "DairyMitra ला उत्तर सापडले नाही.");
      setIsExpense(result.type === "expense");
      setExpenseAmount(result.amount || null);

      // Speak response
      const speakText = result.response || "";
      if (speakText) {
        Speech.speak(speakText, {
          language: detectLanguage(speakText),
          onDone: resetToIdle,
          onError: resetToIdle,
        });
      } else {
        await sleep(1500);
        resetToIdle();
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err?.message || "Network issue. Please try again.");
      safeSetState(STATE.IDLE);
      isWakeActiveRef.current = true;
    }
  }

  function resetToIdle() {
    if (!isMountedRef.current) return;
    // Cooldown before re-arming wake word
    cooldownTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        isWakeActiveRef.current = true;
        safeSetState(STATE.IDLE);
      }
    }, COOLDOWN_MS);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Helpers
  // ─────────────────────────────────────────────────────────────────────────
  function detectLanguage(text) {
    // Devanagari block U+0900–U+097F
    if (/[\u0900-\u097F]/.test(text)) return "hi-IN";
    return "en-IN";
  }

  function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  // Stop speaking + close
  function handleClose() {
    Speech.stop();
    clearTimeout(recordTimerRef.current);
    clearTimeout(cooldownTimerRef.current);
    void stopRecordingIfActive();
    safeSetState(STATE.IDLE);
    isWakeActiveRef.current = true;
    onClose?.();
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────────────────────
  const config = STATE_CONFIG[appState];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <LinearGradient
          colors={["rgba(0,0,0,0.85)", "rgba(0,0,0,0.95)"]}
          style={styles.backdrop}
        />

        <View style={styles.panel}>
          {/* Header */}
          <View style={styles.panelHeader}>
            <View style={styles.brandRow}>
              <Ionicons name="leaf" size={16} color="#4ade80" />
              <Text style={styles.brandText}>DairyMitra Voice</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Animated mic orb */}
          <View style={styles.orbContainer}>
            <Animated.View
              style={[
                styles.orbRing,
                {
                  borderColor: config.ringColor + "44",
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
            <LinearGradient
              colors={config.gradientColors}
              style={styles.orb}
            >
              <Ionicons name={config.icon} size={42} color="#fff" />
            </LinearGradient>
          </View>

          {/* State label */}
          <Text style={styles.stateLabel}>{config.label}</Text>
          <Text style={styles.stateSubLabel}>{config.sublabel}</Text>

          {/* Transcript */}
          {transcript ? (
            <View style={styles.transcriptBox}>
              <Ionicons name="chatbubble-outline" size={12} color="#94a3b8" />
              <Text style={styles.transcriptText} numberOfLines={2}>
                {transcript}
              </Text>
            </View>
          ) : null}

          {/* Response */}
          {response ? (
            <View
              style={[
                styles.responseBox,
                isExpense ? styles.responseBoxExpense : null,
              ]}
            >
              <Ionicons
                name={isExpense ? "wallet-outline" : "chatbubbles-outline"}
                size={16}
                color={isExpense ? "#4ade80" : "#93c5fd"}
              />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.responseText}>{response}</Text>
                {isExpense && expenseAmount ? (
                  <Text style={styles.expenseTag}>
                    ₹{expenseAmount} — saved to KharchiVahi ✓
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={14} color="#f87171" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* State dots */}
          <View style={styles.stateDots}>
            {Object.values(STATE).map((s) => (
              <View
                key={s}
                style={[
                  styles.dot,
                  appState === s ? styles.dotActive : null,
                ]}
              />
            ))}
          </View>

          {/* Manual trigger button (tap to simulate wake word during dev) */}
          {appState === STATE.IDLE ? (
            <TouchableOpacity
              style={styles.triggerBtn}
              onPress={onWakeWordDetected}
              activeOpacity={0.85}
            >
              <Ionicons name="mic" size={16} color="#fff" />
              <Text style={styles.triggerBtnText}>Tap to Speak</Text>
            </TouchableOpacity>
          ) : appState === STATE.LISTENING ? (
            <TouchableOpacity
              style={[styles.triggerBtn, styles.triggerBtnStop]}
              onPress={finaliseRecording}
              activeOpacity={0.85}
            >
              <Ionicons name="stop-circle-outline" size={16} color="#fff" />
              <Text style={styles.triggerBtnText}>Done — Send</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    width: "100%",
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingBottom: 44,
    paddingTop: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  panelHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  brandText: {
    color: "#e2e8f0",
    fontWeight: "800",
    fontSize: 15,
    marginLeft: 6,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  orbContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  orbRing: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
  },
  orb: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  stateLabel: {
    color: "#f1f5f9",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  stateSubLabel: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
    marginBottom: 20,
  },
  transcriptBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 12,
    width: "100%",
    marginBottom: 10,
    gap: 8,
  },
  transcriptText: {
    flex: 1,
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 19,
    marginLeft: 6,
  },
  responseBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#172554",
    borderRadius: 16,
    padding: 14,
    width: "100%",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e3a8a",
  },
  responseBoxExpense: {
    backgroundColor: "#052e16",
    borderColor: "#166534",
  },
  responseText: {
    color: "#e2e8f0",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  expenseTag: {
    marginTop: 6,
    color: "#4ade80",
    fontSize: 12,
    fontWeight: "800",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#450a0a",
    borderRadius: 12,
    padding: 10,
    width: "100%",
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: "#fca5a5",
    fontSize: 13,
    marginLeft: 6,
  },
  stateDots: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
    marginBottom: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1e293b",
  },
  dotActive: {
    backgroundColor: "#4ade80",
    width: 20,
  },
  triggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#166534",
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 8,
    width: "100%",
  },
  triggerBtnStop: {
    backgroundColor: "#991b1b",
  },
  triggerBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
    marginLeft: 8,
  },
});
