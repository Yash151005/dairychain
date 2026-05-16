import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

const toastThemeMap = {
  success: {
    title: "Success",
    icon: "checkmark",
    container: { backgroundColor: "#dff5e8" },
    accent: { backgroundColor: "#61c98a" },
    iconCircle: { backgroundColor: "#61c98a" },
  },
  error: {
    title: "Error",
    icon: "close",
    container: { backgroundColor: "#fde4e6" },
    accent: { backgroundColor: "#ef5b67" },
    iconCircle: { backgroundColor: "#ef5b67" },
  },
  warning: {
    title: "Warning",
    icon: "warning",
    container: { backgroundColor: "#fff1d8" },
    accent: { backgroundColor: "#f5bc42" },
    iconCircle: { backgroundColor: "#f5bc42" },
  },
  info: {
    title: "Info",
    icon: "information",
    container: { backgroundColor: "#dcecff" },
    accent: { backgroundColor: "#3d8df0" },
    iconCircle: { backgroundColor: "#3d8df0" },
  },
};

export default function AppToast({ message, type = "info" }) {
  if (!message) {
    return null;
  }

  const theme = toastThemeMap[type] || toastThemeMap.info;

  return (
    <View style={styles.toastWrap}>
      <View style={[styles.toast, theme.container]}>
        <View style={[styles.toastAccent, theme.accent]} />
        <View style={[styles.toastIconCircle, theme.iconCircle]}>
          <Ionicons name={theme.icon} size={18} color="#ffffff" />
        </View>
        <View style={styles.toastBody}>
          <Text style={styles.toastTitle}>{theme.title}</Text>
          <Text style={styles.toastText}>{message}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toastWrap: {
    position: "absolute",
    top: 18,
    left: 16,
    right: 16,
    zIndex: 20,
    pointerEvents: "none",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    boxShadow: "0 10px 16px rgba(0, 0, 0, 0.12)",
    elevation: 6,
  },
  toastAccent: {
    width: 5,
    alignSelf: "stretch",
  },
  toastIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
    marginVertical: 14,
  },
  toastBody: {
    flex: 1,
    paddingRight: 16,
    paddingVertical: 14,
    paddingLeft: 12,
  },
  toastTitle: {
    color: "#1f2937",
    fontSize: 15,
    fontWeight: "800",
  },
  toastText: {
    marginTop: 2,
    color: "#4b5563",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
});
