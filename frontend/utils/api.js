import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const LEGACY_BASE_URL = "http://10.60.164.44:8080";
const API_BASE_URL_STORAGE_KEY = "@smart-shetakari/preferred-api-base-url";
const REQUEST_TIMEOUT_MS = 4500;

function normalizeBaseUrl(url) {
  return url.replace(/\/$/, "");
}

function resolveBaseUrls() {
  const configuredUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    Constants.expoConfig?.extra?.apiBaseUrl ||
    Constants.manifest?.extra?.apiBaseUrl;

  const candidates = [];

  if (configuredUrl) {
    const normalizedConfiguredUrl = normalizeBaseUrl(configuredUrl);
    const isAndroidEmulatorUrl = normalizedConfiguredUrl.includes("10.0.2.2");
    const isWeb = Platform.OS === "web";

    if (!(isWeb && isAndroidEmulatorUrl)) {
      candidates.push(normalizedConfiguredUrl);
    }
  }

  candidates.push(LEGACY_BASE_URL);

  if (Platform.OS === "android") {
    candidates.push("http://10.0.2.2:8080");
    candidates.push("http://localhost:8080");
    candidates.push("http://10.0.2.2:8000");
    candidates.push("http://localhost:8000");
  } else {
    candidates.push("http://localhost:8080");
    candidates.push("http://localhost:8000");

    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      window.location?.hostname &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      candidates.push(`http://${window.location.hostname}:8080`);
      candidates.push(`http://${window.location.hostname}:8000`);
    }
  }

  return [...new Set(candidates)];
}

const BASE_URLS = resolveBaseUrls();
export const BASE_URL = BASE_URLS[0];
let preferredBaseUrl = BASE_URLS[0];
let preferredBaseUrlPromise = null;

function buildUrl(baseUrl, path) {
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildRequestError(message, statusCode) {
  const error = new Error(message);
  if (statusCode) {
    error.statusCode = statusCode;
  }
  return error;
}

function isRecoverableRequestError(error) {
  if (!error) {
    return false;
  }

  if (error.name === "AbortError") {
    return true;
  }

  if (typeof error.statusCode === "number") {
    return [404, 408, 429, 500, 502, 503, 504].includes(error.statusCode);
  }

  const message = (error.message || "").toLowerCase();
  return (
    message.includes("network request failed") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("failed to fetch") ||
    message.includes("network")
  );
}

async function loadPreferredBaseUrl() {
  if (!preferredBaseUrlPromise) {
    preferredBaseUrlPromise = AsyncStorage.getItem(API_BASE_URL_STORAGE_KEY)
      .then((storedValue) => {
        if (storedValue && BASE_URLS.includes(storedValue)) {
          preferredBaseUrl = storedValue;
        }
        return preferredBaseUrl;
      })
      .catch(() => preferredBaseUrl);
  }

  return preferredBaseUrlPromise;
}

async function persistPreferredBaseUrl(baseUrl) {
  preferredBaseUrl = baseUrl;
  try {
    await AsyncStorage.setItem(API_BASE_URL_STORAGE_KEY, baseUrl);
  } catch {}
}

function getOrderedBaseUrls() {
  return [
    preferredBaseUrl,
    ...BASE_URLS.filter((baseUrl) => baseUrl !== preferredBaseUrl),
  ];
}

async function fetchWithTimeout(url, options, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    return await fetch(url, {
      ...options,
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw buildRequestError(
        `Request timed out after ${timeoutMs / 1000} seconds.`
      );
    }
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function parseJsonResponse(response) {
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.detail ||
      payload?.message ||
      `Request failed with status ${response.status}`;
    throw buildRequestError(message, response.status);
  }

  return payload;
}

export async function requestJson(path, options = {}) {
  const { method = "GET", body, headers = {}, timeout, ...rest } = options;
  const timeoutMs = typeof timeout === "number" ? timeout : REQUEST_TIMEOUT_MS;

  let lastError = null;
  await loadPreferredBaseUrl();

  for (const baseUrl of getOrderedBaseUrls()) {
    try {
      const response = await fetchWithTimeout(buildUrl(baseUrl, path), {
        method,
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        ...rest,
      }, timeoutMs);

      const payload = await parseJsonResponse(response);
      if (preferredBaseUrl !== baseUrl) {
        void persistPreferredBaseUrl(baseUrl);
      }
      return payload;
    } catch (error) {
      lastError = error;
      if (!isRecoverableRequestError(error)) {
        break;
      }
    }
  }

  throw buildRequestError(
    lastError?.message ||
      `Unable to reach backend. Tried: ${BASE_URLS.join(", ")}`
  );
}

export async function getStoredUser() {
  const raw = await AsyncStorage.getItem("user");

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setStoredUser(user) {
  await AsyncStorage.setItem("user", JSON.stringify(user));
}

export async function clearStoredUser() {
  await AsyncStorage.removeItem("user");

  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.localStorage.removeItem("user");
  }
}

function normalizeAuthPayload(data) {
  const email = (data.email || "").trim().toLowerCase();

  return {
    ...data,
    email,
    user_id: data.user_id || email || data.name?.trim()?.toLowerCase()?.replace(/\s+/g, "-"),
    role: data.role || "farmer",
  };
}

export const authApi = {
  register: (data) => requestJson("/api/auth/register", { method: "POST", body: normalizeAuthPayload(data) }),
  login: (data) =>
    requestJson("/api/auth/login", {
      method: "POST",
      body: normalizeAuthPayload(data),
    }),
  getProfile: (userId) => requestJson(`/api/auth/profile/${encodeURIComponent(userId)}`),
  updateProfile: (userId, data) =>
    requestJson(`/api/auth/update-profile/${encodeURIComponent(userId)}`, {
      method: "PUT",
      body: data,
    }),
};

export const dashboardApi = {
  getAdminDashboard: () => requestJson("/api/dashboard/admin"),
  getFarmerDashboard: (farmerId) =>
    requestJson(`/api/dashboard/farmer/${encodeURIComponent(farmerId)}`),
};

export const farmersApi = {
  list: () => requestJson("/api/farmers"),
  get: (userId) => requestJson(`/api/farmers/${encodeURIComponent(userId)}`),
  create: (data) => requestJson("/api/farmers", { method: "POST", body: data }),
  update: (userId, data) =>
    requestJson(`/api/farmers/${encodeURIComponent(userId)}`, {
      method: "PUT",
      body: data,
    }),
  remove: (userId) =>
    requestJson(`/api/farmers/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),
};

export const paymentsApi = {
  getPending: () => requestJson("/api/payments/pending"),
  listByFarmer: (farmerId) =>
    requestJson(`/api/payments/${encodeURIComponent(farmerId)}`),
  add: (data) => requestJson("/api/payments/add", { method: "POST", body: data }),
  update: (paymentId, data) =>
    requestJson(`/api/payments/update/${encodeURIComponent(paymentId)}`, {
      method: "PUT",
      body: data,
    }),
};

export const analyticsApi = {
  milkTrend: () => requestJson("/api/analytics/milk-trend"),
  qualityTrend: () => requestJson("/api/analytics/quality-trend"),
  profit: (farmerId) =>
    requestJson(`/api/analytics/profit/${encodeURIComponent(farmerId)}`),
};

export const adminApi = {
  stats: () => requestJson("/api/admin/stats"),
  reports: () => requestJson("/api/admin/reports"),
  farmersPerformance: () => requestJson("/api/admin/farmers-performance"),
};

export const aiApi = {
  chat: (data) => requestJson("/api/ai/chat", { method: "POST", body: data }),
  createChat: (data) =>
    requestJson("/api/ai/chats", { method: "POST", body: data }),
  listChats: (farmerId) =>
    requestJson(`/api/ai/chats/${encodeURIComponent(farmerId)}`),
  getChat: (chatId, farmerId = "") => {
    const query = farmerId
      ? `?farmer_id=${encodeURIComponent(farmerId)}`
      : "";
    return requestJson(
      `/api/ai/chats/session/${encodeURIComponent(chatId)}${query}`
    );
  },
  queryData: (data) => requestJson("/api/ai/query-data", { method: "POST", body: data }),
};

export const communityApi = {
  getState: (userId) =>
    requestJson(`/api/community/state/${encodeURIComponent(userId)}`),
  sendRequest: (data) =>
    requestJson("/api/community/request", { method: "POST", body: data }),
  respondToRequest: (data) =>
    requestJson("/api/community/request/respond", {
      method: "POST",
      body: data,
    }),
  sendMessage: (data) =>
    requestJson("/api/community/message", { method: "POST", body: data }),
};

export const qrApi = {
  scan: (batchId) => requestJson(`/api/qr/${encodeURIComponent(batchId)}`),
  generate: (data) => requestJson("/api/qr/generate", { method: "POST", body: data }),
  seedDemo: () => requestJson("/api/qr/seed-demo", { method: "POST" }),
  recentBatches: () => requestJson("/api/qr/recent/list"),
};

export const batchApi = {
  create: (data) => requestJson("/api/batch/create", { method: "POST", body: data }),
  get: (batchId) => requestJson(`/api/batch/get/${encodeURIComponent(batchId)}`),
};

export const sensorApi = {
  ingest: (data) => requestJson("/api/sensor", { method: "POST", body: data }),
};

export const uploadApi = {
  /**
   * Upload a base64-encoded profile image via the backend → Cloudinary.
   * @param {string} userId
   * @param {string} base64  - raw base64 string (no data-URI prefix needed)
   */
  profileImage: (userId, base64) =>
    requestJson("/api/upload/profile", {
      method: "POST",
      body: { user_id: userId, image_base64: base64 },
    }),
};

// ─── Hackathon Feature APIs ────────────────────────────────────────────────
// These endpoints call Serper (up to 3 s) + NVIDIA LLM (up to 8 s).
// A 25-second timeout gives enough headroom on slow connections.
const HACKATHON_TIMEOUT = 25_000;

export const hackathonApi = {
  // Feature 1 — MandiBuddy: live dairy price radar
  mandiBuddy: (region = "Pune") =>
    requestJson(`/api/hackathon/mandi-buddy?region=${encodeURIComponent(region)}`, { timeout: HACKATHON_TIMEOUT }),

  // Feature 2 — DudhDarpan: heat-stress yield predictor
  dudhDarpan: (region = "Pune") =>
    requestJson(`/api/hackathon/dudh-darpan?region=${encodeURIComponent(region)}`, { timeout: HACKATHON_TIMEOUT }),

  // Feature 3 — DairyScore: AI credit score
  dairyScore: (farmerId) =>
    requestJson(`/api/hackathon/dairy-score/${encodeURIComponent(farmerId)}`, { timeout: HACKATHON_TIMEOUT }),

  // Feature 4 — KharchiVahi: expense tracker
  addExpense: (data) =>
    requestJson("/api/hackathon/kharchi-vahi", { method: "POST", body: data, timeout: HACKATHON_TIMEOUT }),
  getExpenses: (farmerId) =>
    requestJson(`/api/hackathon/kharchi-vahi/${encodeURIComponent(farmerId)}`, { timeout: HACKATHON_TIMEOUT }),

  // Feature 5 — CharaAlert: fodder scarcity warning
  charaAlert: (region = "Pune") =>
    requestJson(`/api/hackathon/chara-alert?region=${encodeURIComponent(region)}`, { timeout: HACKATHON_TIMEOUT }),

  // Razorpay demo payment link (charges ₹1, displays display_amount)
  createPaymentLink: (data) =>
    requestJson("/api/hackathon/razorpay-order", { method: "POST", body: data, timeout: HACKATHON_TIMEOUT }),

  // Admin notification simulator
  sendNotification: (data) =>
    requestJson("/api/hackathon/notify", { method: "POST", body: data }),
  listNotifications: () =>
    requestJson("/api/hackathon/notifications"),
};

// ─── Voice Assistant API ───────────────────────────────────────────────────
// These use raw fetch (not requestJson) because they send multipart FormData.
const VOICE_TIMEOUT = 30_000;

async function postFormData(path, formData, timeoutMs = VOICE_TIMEOUT) {
  await loadPreferredBaseUrl();
  let lastError = null;

  for (const baseUrl of getOrderedBaseUrls()) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const response = await fetch(buildUrl(baseUrl, path), {
        method: "POST",
        body: formData,
        ...(controller ? { signal: controller.signal } : {}),
        // Do NOT set Content-Type — browser/RN sets it with boundary for multipart
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const j = await response.json();
          detail = j.detail || j.message || detail;
        } catch {}
        throw buildRequestError(detail, response.status);
      }

      const payload = await response.json();
      if (preferredBaseUrl !== baseUrl) void persistPreferredBaseUrl(baseUrl);
      return payload;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      if (!isRecoverableRequestError(error)) break;
    }
  }

  throw buildRequestError(
    lastError?.message || `Voice request failed. Tried: ${BASE_URLS.join(", ")}`
  );
}

export const voiceApi = {
  /**
   * Send a recorded audio file to the DairyMitra voice pipeline.
   * @param {FormData} formData  — must contain "file" (audio) and "farmer_id" (string)
   * @returns {Promise<{transcript, type, response, amount?, category?, saved?}>}
   */
  query: (formData) => postFormData("/api/voice/query", formData),

  /**
   * Manually save an expense after reviewing the voice result.
   * @param {Object} data — { farmer_id, amount, category, description, transcript }
   */
  saveExpense: (data) =>
    requestJson("/api/voice/save-expense", { method: "POST", body: data }),

  /** Quick health check */
  health: () => requestJson("/api/voice/health"),
};
