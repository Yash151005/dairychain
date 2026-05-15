import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getStoredUser, paymentsApi } from "../../../utils/api";

export default function PaymentHistory() {
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setError("");
        const user = await getStoredUser();
        const farmerId = user?.user_id || user?.email;

        if (!farmerId) {
          return;
        }

        const response = await paymentsApi.listByFarmer(farmerId);

        if (!mounted) {
          return;
        }

        setPayments(response?.payments || []);
      } catch (error) {
        console.log("Payments fetch failed:", error.message);
        if (mounted) {
          setError(error.message || "Failed to load payment history.");
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Backend data not loaded</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#1f2937" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Payment History</Text>
          <Text style={styles.subtitle}>Track paid and pending dairy collections.</Text>
        </View>
      </View>

      {payments.length ? payments.map((payment) => (
        <View key={payment._id || payment.payment_id || `${payment.amount}-${payment.paid_at}`} style={styles.paymentCard}>
          <View style={styles.paymentRow}>
            <View>
              <Text style={styles.paymentTitle}>
                {payment.status || "Payment"} Rs {payment.amount || 0}
              </Text>
              <Text style={styles.paymentDate}>
                {payment.paid_at ? new Date(payment.paid_at).toLocaleString() : "No payment date"}
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: `${payment.status === "Released" || payment.status === "Paid" ? "#2e7d32" : "#ef6c00"}18` }]}>
              <Text style={[styles.statusText, { color: payment.status === "Released" || payment.status === "Paid" ? "#2e7d32" : "#ef6c00" }]}>
                {payment.status || "Pending"}
              </Text>
            </View>
          </View>
        </View>
      )) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No payments found</Text>
          <Text style={styles.emptyText}>The backend has not returned any payment rows for this farmer yet.</Text>
        </View>
      )}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1f2937",
  },
  subtitle: {
    marginTop: 4,
    color: "#64748b",
  },
  paymentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  paymentDate: {
    marginTop: 4,
    color: "#64748b",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: {
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
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
