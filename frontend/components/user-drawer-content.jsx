import { Ionicons } from "@expo/vector-icons";
import { DrawerContentScrollView, useDrawerStatus } from "@react-navigation/drawer";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ProfileAvatar from "./profile-avatar";
import {
  analyticsApi,
  clearStoredUser,
  dashboardApi,
  getStoredUser,
} from "../utils/api";

const menuItems = [
  {
    label: "Home",
    subtitle: "Dashboard and milk overview",
    icon: "home-outline",
    route: "/(user)/(tabs)/home",
  },
  {
    label: "Community",
    subtitle: "Farmer requests and conversations",
    icon: "people-outline",
    route: "/(user)/(tabs)/community",
  },
  {
    label: "AI Assistant",
    subtitle: "Farming help and chatbot support",
    icon: "chatbubble-ellipses-outline",
    route: "/(user)/(tabs)/chatbot",
  },
  {
    label: "Blockchain",
    subtitle: "Trace records and milk batches",
    icon: "cube-outline",
    route: "/(user)/(tabs)/blockchain",
  },
  {
    label: "Profile",
    subtitle: "Farmer details and milk quality",
    icon: "person-outline",
    route: "/(user)/(tabs)/profile",
  },
];

const utilityItems = [
  {
    label: "Payment History",
    subtitle: "Track paid and pending entries",
    icon: "wallet-outline",
    route: "/(user)/(tabs)/payment-history",
  },
  {
    label: "QR Scanner",
    subtitle: "Scan cans, batches, and suppliers",
    icon: "qr-code-outline",
    route: "/(user)/(tabs)/qr-scanner",
  },
];

function isRouteActive(pathname, route) {
  return pathname === route;
}

function qualityColor(quality) {
  let q = "";
  if (typeof quality === "string") {
    q = quality;
  } else if (quality && typeof quality === "object") {
    // Handle object by extracting string representation
    q = String(quality?.quality || quality?.name || quality?.value || "");
  } else if (quality) {
    q = String(quality);
  }
  const normalized = (q || "").toLowerCase();
  if (normalized === "good" || normalized === "safe") return "#4ade80";
  if (normalized === "fair" || normalized === "moderate") return "#fbbf24";
  if (normalized === "poor" || normalized === "unsafe") return "#f87171";
  return "rgba(255,255,255,0.6)";
}

export default function UserDrawerContent(props) {
  const pathname = usePathname();
  const router = useRouter();
  const drawerStatus = useDrawerStatus();

  const [userName, setUserName] = useState("Farmer");
  const [userEmail, setUserEmail] = useState("");
  const [userProfileImage, setUserProfileImage] = useState("");
  const [quality, setQuality] = useState(null);
  const [safetyIndex, setSafetyIndex] = useState(null);
  const [netProfit, setNetProfit] = useState(null);
  const [loading, setLoading] = useState(true);

  // Re-read stored user every time the drawer opens → picks up updated profile photo immediately
  useEffect(() => {
    if (drawerStatus !== "open") return;

    let mounted = true;

    (async () => {
      try {
        const user = await getStoredUser();
        if (!mounted || !user) return;

        setUserName(user?.name || user?.email?.split("@")[0] || "Farmer");
        setUserEmail(user?.email || "");
        setUserProfileImage(user?.profile_image || "");

        const farmerId = user?.user_id || user?.email;
        if (!farmerId) return;

        setLoading(true);

        const [dashboardJson, profitJson] = await Promise.allSettled([
          dashboardApi.getFarmerDashboard(farmerId),
          analyticsApi.profit(farmerId),
        ]);

        if (!mounted) return;

        if (dashboardJson.status === "fulfilled" && dashboardJson.value) {
          setQuality(dashboardJson.value.quality ?? null);
          setSafetyIndex(dashboardJson.value.safety_index ?? null);
        }

        if (profitJson.status === "fulfilled" && profitJson.value) {
          setNetProfit(profitJson.value.net_profit ?? null);
        }
      } catch {
        // supplementary data
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [drawerStatus]);

  const handleNavigate = (route) => {
    props.navigation.closeDrawer();
    router.replace(route);
  };

  const handleLogout = async () => {
    const performLogout = async () => {
      await clearStoredUser();
      props.navigation.closeDrawer();
      router.replace("/(auth)/login");
    };

    if (Platform.OS === "web") {
      if (
        typeof window !== "undefined" &&
        window.confirm("Do you want to logout from Smart Shetakari?")
      ) {
        await performLogout();
      }
      return;
    }

    Alert.alert("Logout", "Do you want to logout from Smart Shetakari?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: performLogout },
    ]);
  };

  const qualityLabel = quality
    ? `${quality}${safetyIndex ? ` · ${safetyIndex}` : ""}`
    : safetyIndex ?? (loading ? "Loading…" : "—");

  const profitLabel =
    netProfit !== null
      ? `₹${Number(netProfit).toLocaleString("en-IN")}`
      : loading
      ? "Loading…"
      : "—";

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero Card ── */}
      <LinearGradient
        colors={["#1b5e20", "#2e7d32", "#43a047"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        {/* decorative background circles */}
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />

        {/* circular avatar with ring + online dot */}
        <View style={styles.avatarRing}>
          <ProfileAvatar
            uri={userProfileImage}
            name={userName}
            size={76}
            borderRadius={38}
            backgroundColor="rgba(255,255,255,0.95)"
            textColor="#1b5e20"
            borderWidth={0}
          />
          <View style={styles.onlineDot} />
        </View>

        {/* app badge */}
        <View style={styles.appBadge}>
          <Ionicons name="leaf" size={10} color="#2e7d32" />
          <Text style={styles.appBadgeText}>Smart Shetakari</Text>
        </View>

        <Text style={styles.heroName}>{userName}</Text>
        {userEmail ? (
          <Text style={styles.heroEmail} numberOfLines={1}>
            {userEmail}
          </Text>
        ) : null}

        {/* stat pills */}
        <View style={styles.heroStats}>
          <View style={styles.heroStatPill}>
            <Ionicons
              name="shield-checkmark"
              size={12}
              color={qualityColor(quality)}
            />
            <Text style={styles.heroStatText}>{qualityLabel}</Text>
          </View>
          <View style={styles.heroStatPill}>
            <Ionicons name="cash-outline" size={12} color="#1b5e20" />
            <Text style={styles.heroStatText}>{profitLabel}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Main Navigation ── */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Main Navigation</Text>
        {menuItems.map((item) => {
          const active = isRouteActive(pathname, item.route);
          return (
            <TouchableOpacity
              key={item.route}
              style={[styles.menuItem, active && styles.menuItemActive]}
              activeOpacity={0.88}
              onPress={() => handleNavigate(item.route)}
            >
              <View style={[styles.menuIconWrap, active && styles.menuIconWrapActive]}>
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={active ? "#ffffff" : "#2e7d32"}
                />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>
                  {item.label}
                </Text>
                <Text style={[styles.menuSubtitle, active && styles.menuSubtitleActive]}>
                  {item.subtitle}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={active ? "rgba(255,255,255,0.7)" : "#cbd5e1"}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Quick Tools ── */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Quick Tools</Text>
        {utilityItems.map((item) => {
          const active = isRouteActive(pathname, item.route);
          return (
            <TouchableOpacity
              key={item.route}
              style={[styles.menuItem, active && styles.menuItemActive]}
              activeOpacity={0.88}
              onPress={() => handleNavigate(item.route)}
            >
              <View style={[styles.menuIconWrap, active && styles.menuIconWrapActive]}>
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={active ? "#ffffff" : "#2e7d32"}
                />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>
                  {item.label}
                </Text>
                <Text style={[styles.menuSubtitle, active && styles.menuSubtitleActive]}>
                  {item.subtitle}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={active ? "rgba(255,255,255,0.7)" : "#cbd5e1"}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Logout ── */}
      <TouchableOpacity
        style={styles.logoutButton}
        activeOpacity={0.9}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={18} color="#b42318" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
    backgroundColor: "#f5f8f5",
  },

  /* ── hero ── */
  heroCard: {
    borderRadius: 28,
    paddingVertical: 26,
    paddingHorizontal: 20,
    marginBottom: 18,
    alignItems: "center",
    overflow: "hidden",
  },
  bgCircle1: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -50,
    right: -40,
  },
  bgCircle2: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -30,
    left: -20,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.45)",
    marginBottom: 12,
  },
  onlineDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: "#4ade80",
    borderWidth: 2.5,
    borderColor: "#2e7d32",
  },
  appBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
    gap: 4,
  },
  appBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1b5e20",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
  },
  heroEmail: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
  },
  heroStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 14,
    gap: 8,
    justifyContent: "center",
  },
  heroStatPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 5,
  },
  heroStatText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1f2937",
  },

  /* ── menu ── */
  menuSection: { marginBottom: 4 },
  sectionTitle: {
    marginBottom: 10,
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "800",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#acc9ae",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  menuItemActive: {
    backgroundColor: "#2e7d32",
    shadowColor: "#2e7d32",
    shadowOpacity: 0.22,
  },
  menuIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#edf8ee",
    alignItems: "center",
    justifyContent: "center",
  },
  menuIconWrapActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  menuTextWrap: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1f2937",
  },
  menuLabelActive: { color: "#ffffff" },
  menuSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748b",
    lineHeight: 16,
  },
  menuSubtitleActive: { color: "rgba(255,255,255,0.78)" },

  /* ── logout ── */
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff1f0",
    borderRadius: 18,
    paddingVertical: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#ffd5d2",
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#b42318",
  },
});
