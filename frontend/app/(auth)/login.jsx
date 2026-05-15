import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Keyboard,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppToast from "../../components/app-toast";
import useToast from "../../components/use-toast";
import { authApi, setStoredUser } from "../../utils/api";

const { height: SCREEN_H } = Dimensions.get("window");
const HERO_H = 330;
const OVERLAP = 44;
const SHEET_MIN_H = SCREEN_H - HERO_H + OVERLAP;

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const { toast, showToast } = useToast();
  const scrollRef = useRef(null);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      setKbHeight(e.endCoordinates.height);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const handleLogin = async () => {
    try {
      const payload = {
        user_id: email.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
      };
      const response = await authApi.login(payload);
      const user = response?.user;
      if (!user) {
        showToast(response?.message || "Invalid credentials.", "error");
        return;
      }
      await setStoredUser(user);
      router.replace(
        user.role === "admin" ? "/(admin)/(tabs)/home" : "/(user)/(tabs)/home"
      );
    } catch (error) {
      showToast(error.message || "Unable to login right now.", "error");
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <AppToast message={toast.message} type={toast.type} />

      {/* ── Full-screen image + gradient ── */}
      <Image
        source={require("../../assets/farme_bg.png")}
        style={styles.bgImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.3)", "rgba(5,28,5,0.92)"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Branding — fixed over image ── */}
      <View style={styles.branding}>
        <View style={styles.brandLogo}>
          <Ionicons name="leaf" size={26} color="#2e7d32" />
        </View>
        <Text style={styles.brandName}>Smart Shetakari</Text>
        <Text style={styles.brandTagline}>Dairy · Farm · Management</Text>
      </View>

      {/* ── Scrollable form sheet ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: kbHeight + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />

          <Text style={styles.sheetTitle}>Welcome Back</Text>
          <Text style={styles.sheetSub}>Sign in to your dashboard</Text>

          {/* Email */}
          <View style={styles.inputWrap}>
            <View style={styles.inputIcon}>
              <Ionicons name="mail-outline" size={17} color="#4b9a6e" />
            </View>
            <TextInput
              placeholder="Email address"
              placeholderTextColor="#94a3b8"
              onChangeText={setEmail}
              value={email}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.inputWrap}>
            <View style={styles.inputIcon}>
              <Ionicons name="lock-closed-outline" size={17} color="#4b9a6e" />
            </View>
            <TextInput
              placeholder="Password"
              placeholderTextColor="#94a3b8"
              secureTextEntry={!showPassword}
              onChangeText={setPassword}
              value={password}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={17}
                color="#94a3b8"
              />
            </TouchableOpacity>
          </View>

          {/* Login button */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleLogin}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>Login</Text>
            <View style={styles.primaryBtnArrow}>
              <Ionicons name="arrow-forward" size={16} color="#2e7d32" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(auth)/register")}
            activeOpacity={0.8}
          >
            <Text style={styles.footerText}>
              New user?{" "}
              <Text style={styles.footerLink}>Create an account</Text>
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>or continue as</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Customer scanner */}
          <TouchableOpacity
            onPress={() => router.push("/(customer)/scanner")}
            style={styles.customerBtn}
            activeOpacity={0.85}
          >
            <View style={styles.customerIcon}>
              <Ionicons name="qr-code-outline" size={20} color="#2e7d32" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerTitle}>Scan as Customer</Text>
              <Text style={styles.customerSub}>
                Verify dairy product — no login required
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#051a05" },

  bgImage: {
    position: "absolute",
    width: "100%",
    height: HERO_H + 20,
    top: 0,
  },

  /* branding — ends at HERO_H - OVERLAP - 20 = 266, card starts at 286 */
  branding: {
    position: "absolute",
    top: HERO_H - 190,
    left: 24,
    right: 24,
    zIndex: 1,
  },
  brandLogo: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  brandName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.2,
  },
  brandTagline: {
    marginTop: 5,
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.6,
  },

  /* scroll */
  scrollView: {
    position: "absolute",
    top: HERO_H - OVERLAP,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: OVERLAP,
    borderTopRightRadius: OVERLAP,
  },
  scrollContent: {
    flexGrow: 1,
  },

  /* sheet */
  sheet: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 12,
    minHeight: SHEET_MIN_H,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e2e8f0",
    alignSelf: "center",
    marginBottom: 26,
  },
  sheetTitle: { fontSize: 26, fontWeight: "800", color: "#1f2937" },
  sheetSub: { marginTop: 5, marginBottom: 24, fontSize: 14, color: "#64748b" },

  /* inputs */
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "#eaf2ea",
    height: 56,
  },
  inputIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#edf9ef",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1f2937",
    paddingVertical: 0,
  },
  eyeBtn: { paddingHorizontal: 6 },

  /* primary btn */
  primaryBtn: {
    backgroundColor: "#2e7d32",
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 4,
    shadowColor: "#2e7d32",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 7,
  },
  primaryBtnText: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
  primaryBtnArrow: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* footer */
  footerText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
    marginTop: 16,
  },
  footerLink: { color: "#2e7d32", fontWeight: "800" },

  /* divider */
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#eaf2ea" },
  dividerLabel: { fontSize: 12, color: "#94a3b8", fontWeight: "600" },

  /* customer */
  customerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8faf8",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#d4ebd4",
    gap: 12,
  },
  customerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#edf9ef",
    alignItems: "center",
    justifyContent: "center",
  },
  customerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 3,
  },
  customerSub: { fontSize: 12, color: "#64748b" },
});
