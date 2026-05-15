import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";



export default function Layout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#2e7d32" }}>
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ color }) => (
            <Ionicons name="people" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="chatbot"
        options={{
          title: "AI",
          tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubble" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="blockchain"
        options={{
          title: "Blockchain",
          tabBarIcon: ({ color }) => (
            <Ionicons name="cube" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="payment-history"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="qr-scanner"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="chatbot-copy"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="chatbot-knowledge"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
