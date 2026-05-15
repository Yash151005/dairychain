import { Ionicons } from "@expo/vector-icons";
import { Drawer } from "expo-router/drawer";
import { useNavigation, usePathname } from "expo-router";
import { TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AdminDrawerContent from "../../components/admin-drawer-content";

const routeTitles = [
  { match: "/(admin)/(tabs)/home",      title: "Admin Dashboard"    },
  { match: "/(admin)/(tabs)/farmers",   title: "Manage Farmers"     },
  { match: "/(admin)/(tabs)/analytics", title: "Analytics & Reports"},
  { match: "/(admin)/(tabs)/profile",   title: "Admin Profile"      },
  { match: "/(admin)/(tabs)/batch",     title: "Create Batch"       },
];

function getHeaderTitle(pathname) {
  return routeTitles.find((r) => r.match === pathname)?.title ?? "Smart Shetakari";
}

function DrawerToggle() {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      onPress={() => navigation.toggleDrawer()}
      style={{
        marginLeft: 14,
        width: 42,
        height: 42,
        borderRadius: 13,
        backgroundColor: "#2e7d32",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#2e7d32",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 5,
      }}
      activeOpacity={0.75}
    >
      <Ionicons name="menu" size={22} color="#ffffff" />
    </TouchableOpacity>
  );
}

export default function AdminLayout() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <Drawer
      drawerContent={(props) => <AdminDrawerContent {...props} />}
      screenOptions={{
        headerStatusBarHeight: insets.top,
        headerStyle: {
          backgroundColor: "#ffffff",
          height: 72 + insets.top,
          borderBottomWidth: 1,
          borderBottomColor: "#e2e8f0",
        },
        headerTintColor: "#1f2937",
        headerTitleStyle: { fontWeight: "800", fontSize: 18, color: "#1f2937" },
        headerShadowVisible: false,
        drawerActiveTintColor: "#2e7d32",
        drawerInactiveTintColor: "#4b5563",
        drawerStyle: { backgroundColor: "transparent", width: 320 },
        drawerLabelStyle: { marginLeft: -12, fontSize: 15 },
        overlayColor: "rgba(15, 23, 42, 0.18)",
        sceneStyle: { backgroundColor: "#f4f6f5" },
        drawerType: "slide",
        headerLeft: () => <DrawerToggle />,
        headerRight: () => (
          <View
            style={{
              marginRight: 14,
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: "#edf8ee",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="shield-checkmark" size={18} color="#2e7d32" />
          </View>
        ),
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          title: getHeaderTitle(pathname),
          drawerItemStyle: { display: "none" },
        }}
      />
      {[
        "dairy-score",
        "notify-sim",
        "payment-webview",
        "mandi-buddy",
        "dudh-darpan",
        "kharchi-vahi",
        "chara-alert",
      ].map((screenName) => (
        <Drawer.Screen
          key={screenName}
          name={screenName}
          options={{
            headerShown: false,
            drawerItemStyle: { display: "none" },
          }}
        />
      ))}
    </Drawer>
  );
}
