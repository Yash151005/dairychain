import { Ionicons } from "@expo/vector-icons";
import { Drawer } from "expo-router/drawer";
import { useNavigation, usePathname } from "expo-router";
import { TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import UserDrawerContent from "../../components/user-drawer-content";

const routeTitles = [
  { match: "/(user)/(tabs)/home", title: "Farmer Dashboard" },
  { match: "/(user)/(tabs)/community", title: "Farmer Community" },
  { match: "/(user)/(tabs)/chatbot", title: "AI Assistant" },
  { match: "/(user)/(tabs)/blockchain", title: "Blockchain Records" },
  { match: "/(user)/(tabs)/profile", title: "Farmer Profile" },
  { match: "/(user)/(tabs)/payment-history", title: "Payment History" },
  { match: "/(user)/(tabs)/qr-scanner", title: "QR Scanner" },
];

function getHeaderTitle(pathname) {
  const matchedRoute = routeTitles.find((route) => route.match === pathname);
  return matchedRoute?.title ?? "Smart Shetakari";
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

export default function UserLayout() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <Drawer
      drawerContent={(props) => <UserDrawerContent {...props} />}
      screenOptions={{
        headerStatusBarHeight: insets.top,
        headerStyle: {
          backgroundColor: "#ffffff",
          height: 72 + insets.top,
          borderBottomWidth: 1,
          borderBottomColor: "#e2e8f0",
        },
        headerTintColor: "#1f2937",
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: "800",
          fontSize: 18,
          color: "#1f2937",
        },
        sceneStyle: {
          backgroundColor: "#f4f6f5",
        },
        drawerType: "slide",
        overlayColor: "rgba(15, 23, 42, 0.18)",
        drawerStyle: {
          width: 320,
          backgroundColor: "transparent",
        },
        drawerActiveTintColor: "#2e7d32",
        drawerInactiveTintColor: "#64748b",
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
            <Ionicons name="leaf" size={18} color="#2e7d32" />
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
