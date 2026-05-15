import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AppToast from "../../../components/app-toast";
import ProfileAvatar from "../../../components/profile-avatar";
import useToast from "../../../components/use-toast";
import {
  analyticsApi,
  authApi,
  dashboardApi,
  getStoredUser,
  setStoredUser,
  uploadApi,
} from "../../../utils/api";

function formatTemperature(value) {
  if (value == null || value === "") {
    return "0 °C";
  }
  return `${value} °C`;
}

export default function Profile() {
  const { toast, showToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dashboard, setDashboard] = useState({
    temperature: "0",
    humidity: "0",
    quality: "Pending",
    safety_index: "Unknown",
  });
  const [profit, setProfit] = useState({
    total_income: 0,
    total_expense: 0,
    net_profit: 0,
  });

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      (async () => {
        try {
          setError("");
          const user = await getStoredUser();
          const farmerId = user?.user_id || user?.email;
          if (!farmerId) {
            return;
          }

          if (mounted && user) {
            setProfile(user);
          }

          const [profileJson, dashboardJson, profitJson] = await Promise.all([
            authApi.getProfile(farmerId),
            dashboardApi.getFarmerDashboard(farmerId),
            analyticsApi.profit(farmerId),
          ]);

          if (!mounted) {
            return;
          }

          setProfile(profileJson?.user || user);
          setDashboard(
            dashboardJson || {
              temperature: "0",
              humidity: "0",
              quality: "Pending",
              safety_index: "Unknown",
            }
          );
          setProfit({
            total_income: profitJson?.total_income || 0,
            total_expense: profitJson?.total_expense || 0,
            net_profit: profitJson?.net_profit || 0,
          });
        } catch (err) {
          if (mounted) {
            setError(err.message || "Failed to load profile data.");
          }
        }
      })();

      return () => {
        mounted = false;
      };
    }, [])
  );

  const uploadSelectedAsset = async (asset) => {
    if (!asset?.base64) {
      showToast("Could not read image data.", "error");
      return;
    }

    const stored = await getStoredUser();
    const userId = profile?.user_id || stored?.user_id || stored?.email;
    if (!userId) {
      showToast("Missing user information for upload.", "error");
      return;
    }

    setUploading(true);
    try {
      const response = await uploadApi.profileImage(userId, asset.base64);
      if (!response?.url) {
        throw new Error("Upload failed.");
      }

      const nextStoredUser = {
        ...(stored || {}),
        ...(profile || {}),
        profile_image: response.url,
      };

      setProfile((prev) => ({
        ...nextStoredUser,
        ...(prev || {}),
        profile_image: response.url,
      }));
      await setStoredUser(nextStoredUser);
      showToast("Profile photo updated!", "success");
    } catch (err) {
      showToast(err.message || "Upload failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  const launchPicker = async (mode) => {
    const permission =
      mode === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showToast(
        mode === "camera"
          ? "Camera permission is required."
          : "Gallery permission is required.",
        "error"
      );
      return;
    }

    const result =
      mode === "camera"
        ? await ImagePicker.launchCameraAsync({
            quality: 0.7,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            base64: true,
          });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    await uploadSelectedAsset(result.assets[0]);
  };

  const pickAndUpload = () => {
    if (uploading) {
      return;
    }

    if (Platform.OS === "web") {
      void launchPicker("library");
      return;
    }

    Alert.alert("Update profile photo", "Choose an image source.", [
      {
        text: "Take Photo",
        onPress: () => {
          void launchPicker("camera");
        },
      },
      {
        text: "Choose from Gallery",
        onPress: () => {
          void launchPicker("library");
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const stats = [
    {
      label: "Quality",
      value: dashboard.quality || "Pending",
      icon: "ribbon-outline",
      tint: "#edf9ef",
      accent: "#2e7d32",
    },
    {
      label: "Humidity",
      value: `${dashboard.humidity || "0"}%`,
      icon: "water-outline",
      tint: "#e8f4ff",
      accent: "#1565c0",
    },
    {
      label: "Temp",
      value: formatTemperature(dashboard.temperature),
      icon: "thermometer-outline",
      tint: "#fff8ec",
      accent: "#c2410c",
    },
  ];

  const financeItems = [
    {
      label: "Income",
      amount: profit.total_income,
      color: "#2e7d32",
      bg: "#edf9ef",
      icon: "trending-up-outline",
    },
    {
      label: "Expense",
      amount: profit.total_expense,
      color: "#dc2626",
      bg: "#fff1f2",
      icon: "trending-down-outline",
    },
    {
      label: "Net Profit",
      amount: profit.net_profit,
      color: "#d97706",
      bg: "#fffbeb",
      icon: "wallet-outline",
    },
  ];

  const collectionRows = [
    {
      icon: "thermometer-outline",
      label: "Temperature",
      value: formatTemperature(dashboard.temperature),
    },
    {
      icon: "shield-checkmark-outline",
      label: "Quality Status",
      value: dashboard.quality || "Pending",
    },
    {
      icon: "analytics-outline",
      label: "Safety Index",
      value: dashboard.safety_index || "Unknown",
    },
    {
      icon: "water-outline",
      label: "Humidity",
      value: `${dashboard.humidity || 0}%`,
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppToast message={toast.message} type={toast.type} />

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name="warning-outline" size={16} color="#9a3412" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.errorTitle}>Data not loaded</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </View>
      ) : null}

      {/* ── Hero Card ── */}
      <View style={styles.heroCard}>
        {/* Decorative top strip */}
        <View style={styles.heroBanner} />

        {/* Avatar */}
        <View style={styles.avatarOuter}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={pickAndUpload}
            activeOpacity={0.85}
          >
            <ProfileAvatar
              uri={profile?.profile_image}
              name={profile?.name || profile?.user_id || "Farmer"}
              size={100}
              borderRadius={32}
              backgroundColor="#edf8ee"
              textColor="#2e7d32"
              borderWidth={3}
              borderColor="#ffffff"
            />
            <View style={styles.cameraBadge}>
              {uploading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="camera" size={13} color="#ffffff" />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Role pill */}
        <View style={styles.rolePill}>
          <Ionicons name="leaf-outline" size={11} color="#2e7d32" />
          <Text style={styles.rolePillText}>Farmer</Text>
        </View>

        {/* Name */}
        <Text style={styles.heroName}>
          {profile?.name || "Farmer Profile"}
        </Text>

        {/* Location row */}
        <View style={styles.heroLocRow}>
          <Ionicons name="location-outline" size={13} color="#64748b" />
          <Text style={styles.heroLocText}>
            {profile?.village || profile?.location || "Location not set"}
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.heroDivider} />

        {/* Email + ID chips */}
        <View style={styles.heroInfoRow}>
          <View style={styles.heroInfoChip}>
            <Ionicons name="mail-outline" size={12} color="#4b9a6e" />
            <Text style={styles.heroInfoText} numberOfLines={1}>
              {profile?.email || "—"}
            </Text>
          </View>
          <View style={styles.heroInfoSep} />
          <View style={styles.heroInfoChip}>
            <Ionicons name="finger-print-outline" size={12} color="#4b9a6e" />
            <Text style={styles.heroInfoText} numberOfLines={1}>
              {profile?.user_id
                ? `#${String(profile.user_id).slice(0, 8)}`
                : "—"}
            </Text>
          </View>
        </View>

        {/* Change photo button */}
        <TouchableOpacity
          style={styles.changePhotoBtn}
          onPress={pickAndUpload}
          activeOpacity={0.8}
          disabled={uploading}
        >
          <Ionicons name="camera-outline" size={13} color="#2e7d32" />
          <Text style={styles.changePhotoBtnText}>
            {uploading ? "Uploading…" : "Change Photo"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats Grid ── */}
      <View style={styles.statsGrid}>
        {stats.map((item) => (
          <View
            key={item.label}
            style={[styles.statTile, { backgroundColor: item.tint }]}
          >
            <View
              style={[
                styles.statIconWrap,
                { backgroundColor: "rgba(255,255,255,0.75)" },
              ]}
            >
              <Ionicons name={item.icon} size={20} color={item.accent} />
            </View>
            <Text
              style={[styles.statTileValue, { color: item.accent }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {item.value}
            </Text>
            <Text style={styles.statTileLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Financial Summary ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderIcon}>
            <Ionicons name="bar-chart-outline" size={16} color="#2e7d32" />
          </View>
          <Text style={styles.cardTitle}>Financial Summary</Text>
        </View>
        <View style={styles.financeRow}>
          {financeItems.map((f, i) => (
            <View
              key={f.label}
              style={[
                styles.financeItem,
                i < financeItems.length - 1 && styles.financeItemBorder,
              ]}
            >
              <View
                style={[styles.financeIconWrap, { backgroundColor: f.bg }]}
              >
                <Ionicons name={f.icon} size={16} color={f.color} />
              </View>
              <Text style={styles.financeLabel}>{f.label}</Text>
              <Text style={[styles.financeAmount, { color: f.color }]}>
                ₹{f.amount || 0}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Collection Details ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderIcon}>
            <Ionicons name="layers-outline" size={16} color="#2e7d32" />
          </View>
          <Text style={styles.cardTitle}>Collection Details</Text>
        </View>
        {collectionRows.map((row, i) => (
          <View
            key={row.label}
            style={[
              styles.collectionRow,
              i > 0 && { borderTopWidth: 1, borderTopColor: "#f1f5f9" },
            ]}
          >
            <View style={styles.collectionLeft}>
              <View style={styles.collectionIconBox}>
                <Ionicons name={row.icon} size={14} color="#2e7d32" />
              </View>
              <Text style={styles.collectionLabel}>{row.label}</Text>
            </View>
            <Text style={styles.collectionValue}>{row.value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f5" },
  content: { padding: 16, paddingBottom: 32 },

  /* error */
  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff4e6",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  errorTitle: { fontSize: 14, fontWeight: "800", color: "#9a3412" },
  errorText: { marginTop: 2, fontSize: 13, color: "#b45309", lineHeight: 19 },

  /* ── hero card ── */
  heroCard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    marginBottom: 16,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#2e7d32",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 5,
  },
  heroBanner: {
    width: "100%",
    height: 72,
    backgroundColor: "#2e7d32",
  },
  avatarOuter: {
    marginTop: -46,
    marginBottom: 4,
    shadowColor: "#2e7d32",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
  avatarWrap: {
    width: 106,
    height: 106,
    borderRadius: 34,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 11,
    backgroundColor: "#2e7d32",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#ffffff",
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#edf9ef",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: "#d4ebd4",
  },
  rolePillText: { fontSize: 11, fontWeight: "700", color: "#2e7d32", letterSpacing: 0.5 },
  heroName: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "800",
    color: "#1f2937",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  heroLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },
  heroLocText: { fontSize: 13, color: "#64748b", fontWeight: "500" },
  heroDivider: {
    width: "75%",
    height: 1,
    backgroundColor: "#e9f5e9",
    marginVertical: 14,
  },
  heroInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
  },
  heroInfoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
    justifyContent: "center",
  },
  heroInfoText: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "500",
    flexShrink: 1,
  },
  heroInfoSep: { width: 1, height: 16, backgroundColor: "#d4ebd4" },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    marginBottom: 20,
    backgroundColor: "#f0faf0",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d4ebd4",
  },
  changePhotoBtnText: { fontSize: 13, color: "#2e7d32", fontWeight: "700" },

  /* ── stats grid ── */
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statTile: {
    flex: 1,
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 7,
    shadowColor: "#c0d4c0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statTileValue: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  statTileLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
  },

  /* ── shared card ── */
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#c0d4c0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  cardHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "#edf9ef",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#1f2937" },

  /* ── finance ── */
  financeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  financeItem: {
    flex: 1,
    alignItems: "center",
    gap: 7,
    paddingVertical: 4,
  },
  financeItemBorder: {
    borderRightWidth: 1,
    borderRightColor: "#f1f5f9",
  },
  financeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  financeLabel: { fontSize: 11, fontWeight: "600", color: "#64748b" },
  financeAmount: { fontSize: 16, fontWeight: "800" },

  /* ── collection rows ── */
  collectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
  },
  collectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  collectionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#edf9ef",
    alignItems: "center",
    justifyContent: "center",
  },
  collectionLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },
  collectionValue: { fontSize: 14, fontWeight: "700", color: "#1f2937" },
});
