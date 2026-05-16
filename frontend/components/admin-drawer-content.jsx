import { Ionicons } from "@expo/vector-icons";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, usePathname, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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
  adminApi,
  clearStoredUser,
  dashboardApi,
  getStoredUser,
} from "../utils/api";

const menuItems = [
  {
    label: "Dashboard",
    subtitle: "Overview of farmers and batches",
    icon: "grid-outline",
    route: "/(admin)/(tabs)/home",
    accent: "#2e7d32",
  },
  {
    label: "Farmers",
    subtitle: "Manage suppliers and dairy members",
    icon: "people-outline",
    route: "/(admin)/(tabs)/farmers",
    accent: "#0288d1",
  },
  {
    label: "Analytics",
    subtitle: "Track milk flow and alerts",
    icon: "bar-chart-outline",
    route: "/(admin)/(tabs)/analytics",
    accent: "#ef6c00",
  },
  {
    label: "Profile",
    subtitle: "Admin account and operations summary",
    icon: "person-circle-outline",
    route: "/(admin)/(tabs)/profile",
    accent: "#6d4c41",
  },
];

const actionItems = [
  {
    label: "Create Batch",
    subtitle: "Log a new milk collection batch",
    icon: "add-circle-outline",
    route: "/(admin)/(tabs)/batch",
    accent: "#558b2f",
  },
];

function isRouteActive(pathname, route) {
  return pathname === route;
}

export default function AdminDrawerContent(props) {
  const pathname = usePathname();
  const router = useRouter();

  const [adminName, setAdminName] = useState("Admin");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminProfileImage, setAdminProfileImage] = useState("");
  const [totalFarmers, setTotalFarmers] = useState(null);
  const [milkToday, setMilkToday] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      (async () => {
        setLoading(true);

        try {
          const user = await getStoredUser();
          if (mounted && user) {
            setAdminName(user?.name || user?.email?.split("@")[0] || "Admin");
            setAdminEmail(user?.email || "");
            setAdminProfileImage(user?.profile_image || "");
          }

          const [statsRes, dashRes] = await Promise.allSettled([
            adminApi.stats(),
            dashboardApi.getAdminDashboard(),
          ]);

          if (!mounted) {
            return;
          }

          if (statsRes.status === "fulfilled" && statsRes.value) {
            const stats = statsRes.value?.stats || statsRes.value;
            if (stats?.total_farmers != null) setTotalFarmers(stats.total_farmers);
            if (stats?.active_alerts != null) setActiveAlerts(stats.active_alerts);
          }

          if (dashRes.status === "fulfilled" && dashRes.value) {
            const dashboard = dashRes.value?.dashboard || dashRes.value;
            if (dashboard?.total_farmers != null) setTotalFarmers(dashboard.total_farmers);
            if (dashboard?.active_alerts != null) setActiveAlerts(dashboard.active_alerts);

            const liters =
              dashboard?.milk_today ??
              dashboard?.total_quantity ??
              dashboard?.total_milk ??
              null;
            if (liters != null) setMilkToday(liters);
          }
        } catch {
          // Drawer summary data is supplementary.
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      })();

      return () => {
        mounted = false;
      };
    }, [])
  );

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
        window.confirm("Do you want to logout from the admin panel?")
      ) {
        await performLogout();
      }
      return;
    }

    Alert.alert("Logout", "Do you want to logout from the admin panel?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: performLogout },
    ]);
  };

  const farmersLabel = totalFarmers != null ? `${totalFarmers}+` : loading ? "..." : "-";
  const milkLabel = milkToday != null ? `${milkToday} L` : loading ? "..." : "-";
  const alertsLabel = activeAlerts != null ? String(activeAlerts) : loading ? "..." : "-";

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#174b2a", "#2e7d32", "#76b67a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTopRow}>
          <ProfileAvatar
            uri={adminProfileImage}
            name={adminName}
            size={58}
            borderRadius={18}
            backgroundColor="rgba(255,255,255,0.94)"
            textColor="#174b2a"
            borderWidth={2}
            borderColor="rgba(255,255,255,0.3)"
            style={styles.avatar}
          />
          <View style={styles.statusBadge}>
            <Ionicons name="pulse" size={14} color="#174b2a" />
            <Text style={styles.statusText}>Live Monitoring</Text>
          </View>
        </View>

        <Text style={styles.heroRole}>Admin Console</Text>
        <Text style={styles.heroName}>{adminName}</Text>
        {adminEmail ? (
          <Text style={styles.heroEmail} numberOfLines={1}>
            {adminEmail}
          </Text>
        ) : null}
        <Text style={styles.heroSubtitle}>
          Manage farmers, batch status, operational alerts, and dairy reports.
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{farmersLabel}</Text>
            <Text style={styles.statLabel}>Farmers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{milkLabel}</Text>
            <Text style={styles.statLabel}>Milk Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{alertsLabel}</Text>
            <Text style={styles.statLabel}>Alerts</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admin Navigation</Text>

        {menuItems.map((item) => {
          const active = isRouteActive(pathname, item.route);
          return (
            <TouchableOpacity
              key={item.route}
              style={[styles.menuItem, active && styles.menuItemActive]}
              activeOpacity={0.9}
              onPress={() => handleNavigate(item.route)}
            >
              <View
                style={[
                  styles.menuIconWrap,
                  {
                    backgroundColor: active
                      ? "rgba(255,255,255,0.2)"
                      : `${item.accent}18`,
                  },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={active ? "#ffffff" : item.accent}
                />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>
                  {item.label}
                </Text>
                <Text
                  style={[styles.menuSubtitle, active && styles.menuSubtitleActive]}
                >
                  {item.subtitle}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={active ? "#ffffff" : "#94a3b8"}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        {actionItems.map((item) => {
          const active = isRouteActive(pathname, item.route);
          return (
            <TouchableOpacity
              key={item.route}
              style={[styles.menuItem, active && styles.menuItemActive]}
              activeOpacity={0.9}
              onPress={() => handleNavigate(item.route)}
            >
              <View
                style={[
                  styles.menuIconWrap,
                  {
                    backgroundColor: active
                      ? "rgba(255,255,255,0.2)"
                      : `${item.accent}18`,
                  },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={active ? "#ffffff" : item.accent}
                />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>
                  {item.label}
                </Text>
                <Text
                  style={[styles.menuSubtitle, active && styles.menuSubtitleActive]}
                >
                  {item.subtitle}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={active ? "#ffffff" : "#94a3b8"}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        activeOpacity={0.9}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color="#b42318" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 26,
    backgroundColor: "#f5f8f5",
  },
  heroCard: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 18,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  avatar: {
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#174b2a",
  },
  heroRole: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
  },
  heroEmail: {
    marginTop: 3,
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: "rgba(255,255,255,0.82)",
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  statValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#ffffff",
  },
  statLabel: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
  },
  section: {
    marginBottom: 12,
  },
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
    boxShadow: "0 4px 10px rgba(172, 201, 174, 0.08)",
    elevation: 2,
  },
  menuItemActive: {
    backgroundColor: "#1f7a35",
    shadowColor: "#1f7a35",
    shadowOpacity: 0.22,
    boxShadow: "0 0px 10px rgba(31, 122, 53, 0.22)",
  },
  menuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextWrap: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1f2937",
  },
  menuLabelActive: {
    color: "#ffffff",
  },
  menuSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748b",
    lineHeight: 17,
  },
  menuSubtitleActive: {
    color: "rgba(255,255,255,0.82)",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff1f0",
    borderRadius: 18,
    paddingVertical: 14,
    marginTop: 4,
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
