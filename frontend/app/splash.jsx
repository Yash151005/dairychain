import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Ellipse, Path } from "react-native-svg";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const BAR_W = width - 80;

// ─── Milk Can SVG Icon ────────────────────────────────────────────────────────
function MilkCanIcon() {
  const W = "white";
  const S = "#D4EDDA"; // light shade for top surfaces (3-D depth)
  const M = "#A5D6A7"; // mint green for chain links

  return (
    <Svg width="130" height="230" viewBox="0 0 120 230">
      {/* ── Side handles (drawn behind body) ── */}
      <Path
        d="M18,112 Q3,112 3,126 Q3,140 18,140"
        fill="none"
        stroke={W}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <Path
        d="M102,112 Q117,112 117,126 Q117,140 102,140"
        fill="none"
        stroke={W}
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* ── Body (main cylinder) ── */}
      <Path d="M18,166 L18,90 L102,90 L102,166 Z" fill={W} />
      <Ellipse cx="60" cy="166" rx="42" ry="9" fill={W} />

      {/* ── Shoulder (tapers body → neck) ── */}
      <Path d="M18,90 L30,72 L90,72 L102,90 Z" fill={W} />

      {/* ── Neck (narrow cylinder) ── */}
      <Path d="M30,72 L30,52 L90,52 L90,72 Z" fill={W} />

      {/* ── Lid collar (wider than neck) ── */}
      <Path d="M21,52 L21,36 L99,36 L99,52 Z" fill={W} />
      {/* Lid top surface with subtle shade for 3-D illusion */}
      <Ellipse cx="60" cy="36" rx="39" ry="8" fill={S} />

      {/* ── Lid knob ── */}
      <Ellipse cx="60" cy="28" rx="11" ry="5" fill={W} />

      {/* ── Lid top handle (arch) ── */}
      <Path
        d="M52,29 Q52,14 60,14 Q68,14 68,29"
        fill="none"
        stroke={W}
        strokeWidth="5.5"
        strokeLinecap="round"
      />

      {/* ── Chain links (mint green, hanging below can) ── */}
      {/* Link 1 — horizontal */}
      <Ellipse cx="60" cy="181" rx="12" ry="6" fill="none" stroke={M} strokeWidth="3.5" />
      {/* Link 2 — vertical */}
      <Ellipse cx="60" cy="198" rx="6" ry="11" fill="none" stroke={M} strokeWidth="3.5" />
      {/* Link 3 — horizontal */}
      <Ellipse cx="60" cy="215" rx="12" ry="6" fill="none" stroke={M} strokeWidth="3.5" />
    </Svg>
  );
}

// ─── Corner Bracket Accents ───────────────────────────────────────────────────
function CornerBrackets() {
  const c = "rgba(165, 214, 167, 0.28)";
  const len = 24;
  const thick = 1.5;
  const m = 22;

  return (
    <>
      {/* Top-left ┌ */}
      <View style={{ position: "absolute", top: m, left: m }}>
        <View style={{ width: len, height: thick, backgroundColor: c }} />
        <View style={{ position: "absolute", top: 0, left: 0, width: thick, height: len, backgroundColor: c }} />
      </View>

      {/* Top-right ┐ */}
      <View style={{ position: "absolute", top: m, right: m, width: len, height: len }}>
        <View style={{ position: "absolute", top: 0, right: 0, width: len, height: thick, backgroundColor: c }} />
        <View style={{ position: "absolute", top: 0, right: 0, width: thick, height: len, backgroundColor: c }} />
      </View>

      {/* Bottom-left └ */}
      <View style={{ position: "absolute", bottom: m, left: m, width: len, height: len }}>
        <View style={{ position: "absolute", bottom: 0, left: 0, width: len, height: thick, backgroundColor: c }} />
        <View style={{ position: "absolute", bottom: 0, left: 0, width: thick, height: len, backgroundColor: c }} />
      </View>

      {/* Bottom-right ┘ */}
      <View style={{ position: "absolute", bottom: m, right: m, width: len, height: len }}>
        <View style={{ position: "absolute", bottom: 0, right: 0, width: len, height: thick, backgroundColor: c }} />
        <View style={{ position: "absolute", bottom: 0, right: 0, width: thick, height: len, backgroundColor: c }} />
      </View>
    </>
  );
}

// ─── Splash Screen ─────────────────────────────────────────────────────────────
export default function Splash() {
  const router = useRouter();

  // Animation values
  const glowOpacity     = useRef(new Animated.Value(0)).current;
  const glowScale       = useRef(new Animated.Value(0.85)).current;
  const iconScale       = useRef(new Animated.Value(0)).current;
  const iconTranslateY  = useRef(new Animated.Value(40)).current;
  const brandOpacity    = useRef(new Animated.Value(0)).current;
  const brandTranslateY = useRef(new Animated.Value(28)).current;
  const taglineOpacity  = useRef(new Animated.Value(0)).current;
  const progressWidth   = useRef(new Animated.Value(0)).current;
  const dotsOpacity     = useRef(new Animated.Value(0)).current;
  const dot1            = useRef(new Animated.Value(0.2)).current;
  const dot2            = useRef(new Animated.Value(0.2)).current;
  const dot3            = useRef(new Animated.Value(0.2)).current;

  const navigate = async () => {
    try {
      const stored = await AsyncStorage.getItem("user");
      if (!stored) { router.replace("/(auth)/register"); return; }
      const user = JSON.parse(stored);
      router.replace(user?.role === "admin" ? "/(admin)/(tabs)/home" : "/(user)/(tabs)/home");
    } catch {
      router.replace("/(auth)/register");
    }
  };

  useEffect(() => {
    // ── Glow pulse loop (runs in background once glow is visible) ──
    const glowPulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale,   { toValue: 1.12, duration: 1800, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.72, duration: 1800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(glowScale,   { toValue: 0.92, duration: 1800, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.32, duration: 1800, useNativeDriver: true }),
        ]),
      ])
    );

    // ── Animated pulsing dots ──
    const dotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dot1, { toValue: 1,   duration: 280, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 1,   duration: 280, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 1,   duration: 280, useNativeDriver: true }),
        Animated.delay(500),
        Animated.parallel([
          Animated.timing(dot1, { toValue: 0.2, duration: 200, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0.2, duration: 200, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0.2, duration: 200, useNativeDriver: true }),
        ]),
      ])
    );

    // ── Main entrance sequence ──
    Animated.sequence([
      // 1. Glow ring fades in
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 0.5,  duration: 550, useNativeDriver: true }),
        Animated.timing(glowScale,   { toValue: 1,    duration: 550, useNativeDriver: true }),
      ]),
      // 2. Milk can bounces in (spring)
      Animated.parallel([
        Animated.spring(iconScale, {
          toValue: 1,
          friction: 7,
          tension: 140,
          restSpeedThreshold: 0.5,
          restDisplacementThreshold: 0.5,
          useNativeDriver: true,
        }),
        Animated.timing(iconTranslateY, { toValue: 0, duration: 550, useNativeDriver: true }),
      ]),
      // 3. Brand name slides up & fades in
      Animated.parallel([
        Animated.timing(brandOpacity,    { toValue: 1, duration: 480, useNativeDriver: true }),
        Animated.timing(brandTranslateY, { toValue: 0, duration: 480, useNativeDriver: true }),
      ]),
      // 4. Tagline fades in
      Animated.timing(taglineOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      // 5. Progress bar fills + loading dots appear
      Animated.parallel([
        Animated.timing(dotsOpacity, { toValue: 1,    duration: 300, useNativeDriver: true }),
        Animated.timing(progressWidth, {
          toValue: BAR_W,
          duration: 2300,
          useNativeDriver: false, // width cannot use native driver
        }),
      ]),
    ]).start(({ finished }) => {
      glowPulse.stop();
      dotLoop.stop();
      if (finished) navigate();
    });

    // Start background loops once the glow is visible
    const loopTimer = setTimeout(() => {
      glowPulse.start();
      dotLoop.start();
    }, 1700);

    return () => {
      clearTimeout(loopTimer);
      glowPulse.stop();
      dotLoop.stop();
    };
  }, []);

  return (
    <LinearGradient
      colors={["#0D3B1E", "#1B5E20"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <CornerBrackets />

      {/* Version label */}
      <Text style={styles.version}>v1.0.0</Text>

      {/* ── Centre content ── */}
      <View style={styles.center}>
        {/* Multi-layer radial glow */}
        <Animated.View
          style={[
            styles.glowWrap,
            { opacity: glowOpacity, transform: [{ scale: glowScale }] },
          ]}
        >
          <View style={styles.glowOuter} />
          <View style={styles.glowMid} />
          <View style={styles.glowCore} />
        </Animated.View>

        {/* Milk can icon */}
        <Animated.View
          style={{
            transform: [{ scale: iconScale }, { translateY: iconTranslateY }],
          }}
        >
          <MilkCanIcon />
        </Animated.View>

        {/* Brand name */}
        <Animated.View
          style={{
            opacity: brandOpacity,
            transform: [{ translateY: brandTranslateY }],
            marginTop: 18,
          }}
        >
          <Text style={styles.brand}>
            <Text style={styles.brandDairy}>DAIRY</Text>
            <Text style={styles.brandChain}>CHAIN</Text>
          </Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          TRACK · TRACE · TRUST
        </Animated.Text>
      </View>

      {/* ── Bottom loader ── */}
      <View style={styles.bottom}>
        {/* Progress bar track */}
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width: progressWidth }]}>
            <LinearGradient
              colors={["#2E7D32", "#66BB6A", "#A5D6A7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

        {/* Loading text with pulsing dots */}
        <Animated.View style={[styles.loadRow, { opacity: dotsOpacity }]}>
          <Text style={styles.loadText}>Connecting the chain</Text>
          <Animated.Text style={[styles.dot, { opacity: dot1 }]}>.</Animated.Text>
          <Animated.Text style={[styles.dot, { opacity: dot2 }]}>.</Animated.Text>
          <Animated.Text style={[styles.dot, { opacity: dot3 }]}>.</Animated.Text>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 48,
  },
  version: {
    position: "absolute",
    bottom: 20,
    right: 20,
    color: "rgba(165, 214, 167, 0.4)",
    fontSize: 10,
    letterSpacing: 1,
  },

  // Centre
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Glow layers
  glowWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  glowOuter: {
    position: "absolute",
    width: 310,
    height: 310,
    borderRadius: 155,
    backgroundColor: "rgba(76, 175, 80, 0.06)",
  },
  glowMid: {
    position: "absolute",
    width: 235,
    height: 235,
    borderRadius: 117.5,
    backgroundColor: "rgba(76, 175, 80, 0.09)",
  },
  glowCore: {
    position: "absolute",
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: "rgba(76, 175, 80, 0.14)",
  },

  // Brand
  brand: {
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 4,
  },
  brandDairy: {
    color: "white",
  },
  brandChain: {
    color: "#66BB6A",
  },
  tagline: {
    marginTop: 10,
    fontSize: 11,
    letterSpacing: 5.5,
    color: "rgba(165, 214, 167, 0.72)",
    fontWeight: "600",
  },

  // Bottom loader
  bottom: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 10,
  },
  track: {
    width: "100%",
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
    overflow: "hidden",
  },
  loadRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadText: {
    color: "rgba(165, 214, 167, 0.65)",
    fontSize: 12,
    letterSpacing: 0.8,
  },
  dot: {
    color: "rgba(165, 214, 167, 0.65)",
    fontSize: 18,
    lineHeight: 18,
    marginLeft: 1,
    marginTop: -3,
  },
});
