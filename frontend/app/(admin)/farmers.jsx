import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import ProfileAvatar from "../../components/profile-avatar";
import { farmersApi } from "../../utils/api";

export default function Farmers() {
  const [search, setSearch] = useState("");
  const [farmers, setFarmers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setError("");
        const response = await farmersApi.list();

        if (!mounted) {
          return;
        }

        setFarmers(response?.farmers || []);
      } catch (error) {
        console.log("Farmers fetch failed:", error.message);
        if (mounted) {
          setError(error.message || "Failed to load farmers.");
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredFarmers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return farmers;
    }

    return farmers.filter((farmer) => {
      const name = String(farmer.name || farmer.user_id || "").toLowerCase();
      const email = String(farmer.email || "").toLowerCase();
      const village = String(farmer.village || farmer.location || "").toLowerCase();
      return name.includes(term) || email.includes(term) || village.includes(term);
    });
  }, [farmers, search]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Backend data not loaded</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.headerRow}>
        <Text style={styles.title}>Farmers List</Text>
        <Ionicons name="search" size={22} color="#64748b" />
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#94a3b8" />
        <TextInput
          placeholder="Search by name, email, or village"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {filteredFarmers.map((farmer, index) => (
        <View
          key={farmer._id || farmer.user_id || farmer.email || `${farmer.name}-${index}`}
          style={[styles.card, { backgroundColor: index % 2 === 0 ? "#edf9ef" : "#eef9f1" }]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <ProfileAvatar
                uri={farmer.profile_image}
                name={farmer.name || farmer.user_id || farmer.email}
                size={58}
                borderRadius={20}
                backgroundColor="rgba(255,255,255,0.92)"
                textColor="#2e7d32"
                style={styles.avatar}
              />
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>
                  {farmer.name || farmer.user_id || "Unnamed Farmer"}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {farmer.village || farmer.location || farmer.email || "No location available"}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </View>

          <View style={styles.metricRow}>
            <View>
              <Text style={styles.metricLabel}>User ID</Text>
              <Text style={styles.metricValueSmall}>{farmer.user_id || farmer.email || "-"}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{farmer.role || "farmer"}</Text>
            </View>
          </View>
        </View>
      ))}

      {!filteredFarmers.length ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No farmers found</Text>
          <Text style={styles.emptyText}>The backend did not return any farmer records yet.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f5",
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  errorCard: {
    backgroundColor: "#fff4e6",
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#9a3412",
  },
  errorText: {
    marginTop: 4,
    color: "#b45309",
    lineHeight: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1f2937",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    marginLeft: 8,
    color: "#1f2937",
  },
  card: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
  },
  cardSubtitle: {
    marginTop: 4,
    color: "#64748b",
  },
  metricRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricLabel: {
    color: "#64748b",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2e7d32",
  },
  statusPill: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: {
    fontWeight: "800",
    color: "#2f3b2f",
  },
  metricValueSmall: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2e7d32",
  },
  emptyCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: "#ffffff",
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2937",
  },
  emptyText: {
    marginTop: 6,
    color: "#64748b",
  },
});
