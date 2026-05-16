import * as Speech from "expo-speech";
import { Platform } from "react-native";

import { LANGUAGE_VOICES } from "./chatbot-copy";

const normalizeEnvValue = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  return trimmed.replace(/^['"]|['"]$/g, "").trim();
};

const ELEVENLABS_API_KEY = normalizeEnvValue(
  process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY
);
const ELEVENLABS_VOICE_ID =
  normalizeEnvValue(process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID) ||
  "JBFqnCBsd6RMkjVDRZzb";
const ELEVENLABS_MODEL_ID =
  normalizeEnvValue(process.env.EXPO_PUBLIC_ELEVENLABS_MODEL_ID) ||
  "eleven_v3";

const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

let activePlaybackId = 0;
let audioElement = null;
let audioObjectUrl = null;
let nativePlayer = null;
let nativePlayerSubscription = null;
let nativeAudioUri = null;
let expoAvModule = undefined;
let expoFileSystemModule = undefined;

const getExpoAv = () => {
  if (Platform.OS === "web") {
    return null;
  }

  if (expoAvModule !== undefined) {
    return expoAvModule;
  }

  try {
    expoAvModule = require("expo-av");
  } catch (error) {
    console.warn("expo-av is unavailable, falling back to expo-speech.", error);
    expoAvModule = null;
  }

  return expoAvModule;
};

const getExpoFileSystem = () => {
  if (Platform.OS === "web") {
    return null;
  }

  if (expoFileSystemModule !== undefined) {
    return expoFileSystemModule;
  }

  try {
    expoFileSystemModule = require("expo-file-system");
  } catch (error) {
    console.warn("expo-file-system is unavailable for ElevenLabs playback.", error);
    expoFileSystemModule = null;
  }

  return expoFileSystemModule;
};

const getBrowserAudioConstructor = () => {
  if (Platform.OS !== "web" || typeof globalThis === "undefined") {
    return null;
  }

  return typeof globalThis.Audio === "function" ? globalThis.Audio : null;
};

const nextPlaybackId = () => {
  activePlaybackId += 1;
  return activePlaybackId;
};

const isActivePlayback = (playbackId) => activePlaybackId === playbackId;

const invokeSafely = (callback, ...args) => {
  if (typeof callback === "function") {
    callback(...args);
  }
};

const bytesToBase64 = (bytes) => {
  let result = "";
  let index = 0;

  while (index < bytes.length) {
    const byte1 = bytes[index++];
    const byte2 = index < bytes.length ? bytes[index++] : NaN;
    const byte3 = index < bytes.length ? bytes[index++] : NaN;

    const chunk =
      (byte1 << 16) | ((Number.isNaN(byte2) ? 0 : byte2) << 8) | (Number.isNaN(byte3) ? 0 : byte3);

    result += BASE64_CHARS[(chunk >> 18) & 63];
    result += BASE64_CHARS[(chunk >> 12) & 63];
    result += Number.isNaN(byte2) ? "=" : BASE64_CHARS[(chunk >> 6) & 63];
    result += Number.isNaN(byte3) ? "=" : BASE64_CHARS[chunk & 63];
  }

  return result;
};

const cleanupWebAudio = () => {
  if (audioElement) {
    try {
      audioElement.pause();
      audioElement.removeAttribute("src");
      audioElement.load();
    } catch {}

    audioElement.onended = null;
    audioElement.onerror = null;
    audioElement = null;
  }

  if (audioObjectUrl && typeof URL !== "undefined" && URL.revokeObjectURL) {
    URL.revokeObjectURL(audioObjectUrl);
  }

  audioObjectUrl = null;
};

const cleanupNativeAudio = async () => {
  const FileSystem = getExpoFileSystem();
  const player = nativePlayer;
  const subscription = nativePlayerSubscription;
  nativePlayer = null;
  nativePlayerSubscription = null;

  if (subscription?.remove) {
    try {
      subscription.remove();
    } catch {}
  }

  if (player) {
    try {
      await player.pauseAsync();
    } catch {}

    try {
      await player.unloadAsync();
    } catch {}
  }

  const fileUri = nativeAudioUri;
  nativeAudioUri = null;

  if (fileUri && FileSystem?.deleteAsync) {
    try {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    } catch {}
  }
};

const cleanupPlayback = async () => {
  cleanupWebAudio();
  await cleanupNativeAudio();

  try {
    Speech.stop();
  } catch {}
};

const buildElevenLabsError = async (response) => {
  let detail = "";

  try {
    const contentType = response.headers?.get?.("content-type") || "";

    if (contentType.includes("application/json")) {
      const payload = await response.json();
      detail =
        payload?.detail?.message ||
        payload?.detail?.code ||
        payload?.detail ||
        payload?.message ||
        "";
    } else {
      detail = (await response.text())?.trim();
    }
  } catch {}

  const suffix = detail ? ` ${detail}` : "";

  if (response.status === 401) {
    return new Error(
      `ElevenLabs auth failed (401). Check EXPO_PUBLIC_ELEVENLABS_API_KEY in frontend/.env, generate a fresh API key if needed, then restart Expo with -c.${suffix}`
    );
  }

  return new Error(
    `ElevenLabs request failed with status ${response.status}.${suffix}`
  );
};

const fetchElevenLabsAudio = async (text) => {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API key is not configured.");
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL_ID,
      }),
    }
  );

  if (!response.ok) {
    throw await buildElevenLabsError(response);
  }

  const audioBuffer = await response.arrayBuffer();
  return new Uint8Array(audioBuffer);
};

const playAudioOnWeb = async (audioBytes, playbackId, callbacks) => {
  const BrowserAudio = getBrowserAudioConstructor();

  if (
    !BrowserAudio ||
    typeof Blob === "undefined" ||
    typeof URL === "undefined" ||
    !URL.createObjectURL
  ) {
    return false;
  }

  cleanupWebAudio();

  const objectUrl = URL.createObjectURL(
    new Blob([audioBytes], { type: "audio/mpeg" })
  );

  if (!isActivePlayback(playbackId)) {
    URL.revokeObjectURL(objectUrl);
    return false;
  }

  audioObjectUrl = objectUrl;
  audioElement = new BrowserAudio(objectUrl);

  audioElement.onended = () => {
    if (!isActivePlayback(playbackId)) {
      return;
    }

    invokeSafely(callbacks.onDone);
    void cleanupPlayback();
  };

  audioElement.onerror = () => {
    if (!isActivePlayback(playbackId)) {
      return;
    }

    invokeSafely(
      callbacks.onError,
      new Error("Unable to play ElevenLabs audio in the browser.")
    );
    void cleanupPlayback();
  };

  try {
    await audioElement.play();
    return true;
  } catch (error) {
    cleanupWebAudio();
    throw error;
  }
};

const playAudioOnNative = async (audioBytes, playbackId, callbacks) => {
  const ExpoAv = getExpoAv();
  const FileSystem = getExpoFileSystem();
  const ExpoAudio = ExpoAv?.Audio;

  if (
    Platform.OS === "web" ||
    !ExpoAudio?.Sound?.createAsync ||
    !ExpoAudio?.setAudioModeAsync ||
    !FileSystem?.cacheDirectory ||
    !FileSystem?.writeAsStringAsync ||
    !FileSystem?.EncodingType?.Base64
  ) {
    return false;
  }

  const fileUri = `${FileSystem.cacheDirectory}tts-${playbackId}-${Date.now()}.mp3`;
  const base64Audio = bytesToBase64(audioBytes);

  await FileSystem.writeAsStringAsync(fileUri, base64Audio, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (!isActivePlayback(playbackId)) {
    await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
    return false;
  }

  nativeAudioUri = fileUri;

  await ExpoAudio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    staysActiveInBackground: false,
  });

  const { sound: player } = await ExpoAudio.Sound.createAsync(
    { uri: fileUri },
    { shouldPlay: false }
  );

  if (!player) {
    await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
    return false;
  }

  player.setOnPlaybackStatusUpdate?.((status) => {
    if (!isActivePlayback(playbackId)) {
      return;
    }

    if (status?.didJustFinish) {
      invokeSafely(callbacks.onDone);
      void cleanupPlayback();
    }
  });

  if (!isActivePlayback(playbackId)) {
    try {
      player.setOnPlaybackStatusUpdate?.(null);
    } catch {}

    try {
      await player.unloadAsync();
    } catch {}

    await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
    return false;
  }

  nativePlayer = player;
  nativePlayerSubscription = null;

  try {
    await player.playAsync();
  } catch (error) {
    await cleanupNativeAudio();
    throw error;
  }

  return true;
};

const speakWithExpo = (text, language, playbackId, callbacks) => {
  if (!Speech?.speak) {
    return false;
  }

  try {
    Speech.stop();
  } catch {}

  Speech.speak(text, {
    language,
    pitch: 1,
    rate: 0.92,
    onDone: () => {
      if (isActivePlayback(playbackId)) {
        invokeSafely(callbacks.onDone);
      }
    },
    onStopped: () => {
      if (isActivePlayback(playbackId)) {
        invokeSafely(callbacks.onDone);
      }
    },
    onError: (error) => {
      if (isActivePlayback(playbackId)) {
        invokeSafely(callbacks.onError, error);
      }
    },
  });

  return true;
};

export const stopSpeaking = async () => {
  nextPlaybackId();
  await cleanupPlayback();
};

export const speakText = async (text, languageKey, callbacks = {}) => {
  const trimmedText = (text || "").trim();

  if (!trimmedText) {
    return false;
  }

  const playbackId = nextPlaybackId();
  const language = LANGUAGE_VOICES[languageKey] || LANGUAGE_VOICES.en;

  await cleanupPlayback();

  try {
    const audioBytes = await fetchElevenLabsAudio(trimmedText);

    if (!isActivePlayback(playbackId)) {
      return false;
    }

    if (Platform.OS === "web") {
      if (await playAudioOnWeb(audioBytes, playbackId, callbacks)) {
        return true;
      }
    } else if (await playAudioOnNative(audioBytes, playbackId, callbacks)) {
      return true;
    }
  } catch (error) {
    console.warn("ElevenLabs TTS failed, falling back to expo-speech.", error);
  }

  if (!isActivePlayback(playbackId)) {
    return false;
  }

  return speakWithExpo(trimmedText, language, playbackId, callbacks);
};
