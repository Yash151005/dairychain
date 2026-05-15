import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AppToast from "../../components/app-toast";
import useToast from "../../components/use-toast";
import { adminApi, authApi, getStoredUser, setStoredUser, uploadApi } from "../../utils/api";

export default function AdminProfile() {
  const { toast, showToast } = useToast();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ total_farmers: 0, total_batches: 0, active_alerts: 0 });
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setError("");
        const storedUser = await getStoredUser();
        if (!storedUser?.user_id) return;

        const [profileJson, statsJson] = await Promise.all([
          authApi.getProfile(storedUser.user_id),
          adminApi.stats(),
        ]);

        if (!mounted) return;
        setProfile(profileJson?.user || storedUser);
        setStats(statsJson?.stats || { total_farmers: 0, total_batches: 0, active_alerts: 0 });
      } catch (err) {
        if (mounted) setError(err.message || "Failed to load admin profile.");
      }
    })();

    return () => { mounted = false; };
  }, []);

  const pickAndUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("Gallery permission is required.", "error");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      showToast("Could not read image data.", "error");
      return;
    }

    setUploading(true);
    try {
      const userId = profile?.user_id;
      const res = await uploadApi.profileImage(userId, asset.base64);
      const newUrl = res?.url;
      if (newUrl) {
        setProfile((prev) => ({ ...prev, profile_image: newUrl }));
        // Update cached user
        const stored = await getStoredUser();
        await setStoredUser({ ...stored, profile_image: newUrl });
        showToast("Profile photo updated!", "success");
      }
    } catch (err) {
      showToast(err.message || "Upload failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppToast message={toast.message} type={toast.type} />

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Backend data not loaded</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.heroCard}>
        {/* Avatar */}
        <TouchableOpacity style={styles.avatarWrap} onPress={pickAndUpload} activeOpacity={0.85}>
          {profile?.profile_image ? (
            <Image source={{ uri: profile.profile_image }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="shield-checkmark" size={28} color="#2e7d32" />
            </View>
          )}
          {/* Camera overlay */}
          <View style={styles.cameraBadge}>
            {uploading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="camera" size={14} color="#ffffff" />
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.uploadHint}>Tap photo to change</Text>
        <Text style={styles.title}>{profile?.name || "Admin Account"}</Text>
        <Text style={styles.subtitle}>
          {profile?.email || "Manage supply chain visibility and farmer operations."}
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Account Summary</Text>
        <Text style={styles.infoText}>Role: {profile?.role || "admin"}</Text>
        <Text style={styles.infoText}>Farmers managed: {stats.total_farmers || 0}</Text>
        <Text style={styles.infoText}>Today's monitored batches: {stats.total_batches || 0}</Text>
        <Text style={styles.infoText}>Pending alerts: {stats.active_alerts || 0}</Text>
        {profile?.user_id ? <Text style={styles.infoText}>User ID: {profile.user_id}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f5" },
  content: { padding: 16, paddingBottom: 28 },
  errorCard: { backgroundColor: "#fff4e6", borderRadius: 20, padding: 14, marginBottom: 14 },
  errorTitle: { fontSize: 16, fontWeight: "800", color: "#9a3412" },
  errorText: { marginTop: 4, color: "#b45309", lineHeight: 20 },

  heroCard: {
    backgroundColor: "#eaf7ea",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    marginBottom: 14,
  },
  avatarWrap: {
    width: 90,
    height: 90,
    borderRadius: 28,
    shadowColor: "#2e7d32",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarImg: {
    width: 90,
    height: 90,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: "#2e7d32",
  },
  avatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#c8e6c9",
  },
  cameraBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#2e7d32",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  uploadHint: { marginTop: 10, fontSize: 12, color: "#94a3b8", fontWeight: "600" },
  title: { marginTop: 6, fontSize: 22, fontWeight: "800", color: "#1f2937" },
  subtitle: { marginTop: 4, color: "#64748b", textAlign: "center", lineHeight: 20 },

  infoCard: { backgroundColor: "#ffffff", borderRadius: 22, padding: 18 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#1f2937", marginBottom: 12 },
  infoText: { fontSize: 15, color: "#4b5563", marginBottom: 8 },
});
