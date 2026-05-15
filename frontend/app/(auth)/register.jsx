import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
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
import { authApi } from "../../utils/api";

const { height: SCREEN_H } = Dimensions.get("window");
const HERO_H = 300;
const OVERLAP = 44;
const SHEET_MIN_H = SCREEN_H - HERO_H + OVERLAP;

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("farmer");
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

  const handleRegister = async () => {
    if (!email || !password || !name) {
      showToast("All fields are required.", "warning");
      return;
    }
    try {
      await authApi.register({
        user_id: email.trim().toLowerCase(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });
      showToast("Registered successfully!", "success");
      setTimeout(() => router.replace("/(auth)/login"), 700);
    } catch (error) {
      showToast(error.message || "Registration failed.", "error");
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <AppToast message={toast.message} type={toast.type} />

      {/* ── Full-screen image + gradient ── */}
      <Image
        source={require("../../assets/admin_bg.png")}
        style={styles.bgImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.25)", "rgba(5,28,5,0.92)"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Branding — fixed over image ── */}
      <View style={styles.branding}>
        <View style={styles.brandLogo}>
          <Ionicons name="person-add-outline" size={24} color="#2e7d32" />
        </View>
        <Text style={styles.brandName}>Join Smart Shetakari</Text>
        <Text style={styles.brandTagline}>Start your dairy journey today</Text>
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

          <Text style={styles.sheetTitle}>Create Account</Text>
          <Text style={styles.sheetSub}>Fill in your details to get started</Text>

          {/* Name */}
          <View style={styles.inputWrap}>
            <View style={styles.inputIcon}>
              <Ionicons name="person-outline" size={17} color="#4b9a6e" />
            </View>
            <TextInput
              placeholder="Full name"
              placeholderTextColor="#94a3b8"
              onChangeText={setName}
              value={name}
              style={styles.input}
              returnKeyType="next"
            />
          </View>

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
              onSubmitEditing={Keyboard.dismiss}
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

          {/* Role selector */}
          <Text style={styles.roleLabel}>Choose your role</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[styles.roleBtn, role === "farmer" && styles.roleBtnActive]}
              onPress={() => setRole("farmer")}
              activeOpacity={0.85}
            >
              <View style={[styles.roleIconBox, role === "farmer" && styles.roleIconActive]}>
                <Ionicons
                  name="leaf-outline"
                  size={17}
                  color={role === "farmer" ? "#ffffff" : "#2e7d32"}
                />
              </View>
              <Text style={[styles.roleText, role === "farmer" && styles.roleTextActive]}>
                Farmer
              </Text>
              {role === "farmer" && (
                <View style={styles.roleCheck}>
                  <Ionicons name="checkmark" size={11} color="#2e7d32" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleBtn, role === "admin" && styles.roleBtnActive]}
              onPress={() => setRole("admin")}
              activeOpacity={0.85}
            >
              <View style={[styles.roleIconBox, role === "admin" && styles.roleIconActive]}>
                <Ionicons
                  name="shield-outline"
                  size={17}
                  color={role === "admin" ? "#ffffff" : "#2e7d32"}
                />
              </View>
              <Text style={[styles.roleText, role === "admin" && styles.roleTextActive]}>
                Admin
              </Text>
              {role === "admin" && (
                <View style={styles.roleCheck}>
                  <Ionicons name="checkmark" size={11} color="#2e7d32" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Register button */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleRegister}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>Create Account</Text>
            <View style={styles.primaryBtnArrow}>
              <Ionicons name="arrow-forward" size={16} color="#2e7d32" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.8}
          >
            <Text style={styles.footerText}>
              Already have an account?{" "}
              <Text style={styles.footerLink}>Login</Text>
            </Text>
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

  /* branding — ends at HERO_H - OVERLAP - 20 = 236, card starts at 256 */
  branding: {
    position: "absolute",
    top: HERO_H - 185,
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
    fontSize: 25,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.2,
  },
  brandTagline: {
    marginTop: 5,
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.5,
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
    marginBottom: 24,
  },
  sheetTitle: { fontSize: 26, fontWeight: "800", color: "#1f2937" },
  sheetSub: { marginTop: 5, marginBottom: 22, fontSize: 14, color: "#64748b" },

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

  /* role */
  roleLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 10,
  },
  roleRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  roleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: "#eaf2ea",
    gap: 8,
  },
  roleBtnActive: { backgroundColor: "#edf9ef", borderColor: "#2e7d32" },
  roleIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#edf9ef",
    alignItems: "center",
    justifyContent: "center",
  },
  roleIconActive: { backgroundColor: "#2e7d32" },
  roleText: { flex: 1, fontSize: 14, fontWeight: "700", color: "#475569" },
  roleTextActive: { color: "#1a5c1a" },
  roleCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#d4ebd4",
    alignItems: "center",
    justifyContent: "center",
  },

  /* primary btn */
  primaryBtn: {
    backgroundColor: "#2e7d32",
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
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
    marginBottom: 8,
  },
  footerLink: { color: "#2e7d32", fontWeight: "800" },
});
