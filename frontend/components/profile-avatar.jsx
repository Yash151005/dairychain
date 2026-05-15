import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View } from "react-native";

export function getAvatarInitials(name = "") {
  const words = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return "";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export default function ProfileAvatar({
  uri,
  name = "",
  size = 52,
  borderRadius = 18,
  backgroundColor = "#edf8ee",
  textColor = "#1b5e20",
  iconName = "person",
  iconColor = "#2e7d32",
  fontSize,
  fontWeight = "800",
  borderWidth = 0,
  borderColor = "transparent",
  preferInitials = true,
  style,
  imageStyle,
  textStyle,
}) {
  const initials = getAvatarInitials(name);
  const resolvedFontSize = fontSize ?? Math.max(16, Math.round(size * 0.36));
  const frameStyle = {
    width: size,
    height: size,
    borderRadius,
    borderWidth,
    borderColor,
  };

  if (uri) {
    return (
      <View style={[styles.frame, frameStyle, style]}>
        <Image
          source={{ uri }}
          style={[styles.image, { borderRadius }, imageStyle]}
        />
      </View>
    );
  }

  return (
    <View style={[styles.frame, frameStyle, { backgroundColor }, style]}>
      {preferInitials && initials ? (
        <Text
          style={[
            styles.initials,
            { color: textColor, fontSize: resolvedFontSize, fontWeight },
            textStyle,
          ]}
        >
          {initials}
        </Text>
      ) : (
        <Ionicons name={iconName} size={resolvedFontSize} color={iconColor} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  initials: {
    letterSpacing: 0.5,
  },
});
