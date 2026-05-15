import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

export default function PaymentWebViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const urlParam = Array.isArray(params.url) ? params.url[0] : params.url;
  const titleParam = Array.isArray(params.title) ? params.title[0] : params.title;
  const farmerNameParam = Array.isArray(params.farmerName)
    ? params.farmerName[0]
    : params.farmerName;

  const decodedUrl = urlParam ? decodeURIComponent(urlParam) : "";

  if (!decodedUrl) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.fallbackWrap}>
          <Text style={styles.fallbackTitle}>Payment link unavailable</Text>
          <Text style={styles.fallbackText}>
            No payment URL was provided for this screen.
          </Text>
          <TouchableOpacity style={styles.backBtnWide} onPress={() => router.back()}>
            <Text style={styles.backBtnWideText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (Platform.OS === "web") {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.fallbackWrap}>
          <Text style={styles.fallbackTitle}>Web fallback</Text>
          <Text style={styles.fallbackText}>
            This in-app payment viewer is intended for Android and iOS dev builds.
          </Text>
          <Text style={styles.fallbackText}>{decodedUrl}</Text>
          <TouchableOpacity style={styles.backBtnWide} onPress={() => router.back()}>
            <Text style={styles.backBtnWideText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.topText}>
          <Text style={styles.topTitle}>{titleParam || "Payment"}</Text>
          <Text style={styles.topSubtitle}>{farmerNameParam || "SmartShetakari"}</Text>
        </View>
      </View>

      <WebView
        source={{ uri: decodedUrl }}
        style={styles.webview}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        originWhitelist={["*"]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#12081f" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#12081f",
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  topText: { flex: 1, marginLeft: 12 },
  topTitle: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
  topSubtitle: { color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 2 },
  webview: { flex: 1, backgroundColor: "#ffffff" },
  fallbackWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  fallbackTitle: { fontSize: 22, fontWeight: "800", color: "#ffffff" },
  fallbackText: { marginTop: 10, textAlign: "center", color: "rgba(255,255,255,0.78)", lineHeight: 20 },
  backBtnWide: {
    marginTop: 18,
    backgroundColor: "#7b1fa2",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  backBtnWideText: { color: "#ffffff", fontWeight: "800" },
});
