import { useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import AppToast from "../../../components/app-toast";
import useToast from "../../../components/use-toast";
import ChatScreen from "../../../components/community/ChatScreen";
import CommunityHub from "../../../components/community/CommunityHub";
import NetworkScreen from "../../../components/community/NetworkScreen";
import RequestsScreen from "../../../components/community/RequestsScreen";
import { communityApi, getStoredUser } from "../../../utils/api";

const SCREEN = {
  HUB: "hub",
  REQUESTS: "requests",
  NETWORK: "network",
  CHAT: "chat",
};

const EMPTY_STATE = {
  farmers: [],
  messagesByFarmer: {},
};

const resolveUserId = (user) =>
  user?.user_id || user?.email || user?.name?.trim() || "guest";

const normalizeCommunityState = (state) => ({
  farmers: Array.isArray(state?.farmers) ? state.farmers : [],
  messagesByFarmer:
    state?.messages_by_farmer && typeof state.messages_by_farmer === "object"
      ? state.messages_by_farmer
      : {},
});

export default function CommunityScreen() {
  const navigation = useNavigation();
  const { toast, showToast } = useToast();

  const [currentUserId, setCurrentUserId] = useState("");
  const [farmers, setFarmers] = useState(EMPTY_STATE.farmers);
  const [messagesByFarmer, setMessagesByFarmer] = useState(
    EMPTY_STATE.messagesByFarmer
  );
  const [activeScreen, setActiveScreen] = useState(SCREEN.HUB);
  const [activeFarmerId, setActiveFarmerId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    const drawerNav = navigation.getParent();
    const isSubScreen = activeScreen !== SCREEN.HUB;
    drawerNav?.setOptions({ headerShown: !isSubScreen });

    return () => {
      drawerNav?.setOptions({ headerShown: true });
    };
  }, [activeScreen, navigation]);

  const applyState = (state) => {
    const normalizedState = normalizeCommunityState(state);
    setFarmers(normalizedState.farmers);
    setMessagesByFarmer(normalizedState.messagesByFarmer);
  };

  useEffect(() => {
    let cancelled = false;

    const loadCommunityState = async () => {
      setIsLoading(true);

      try {
        const user = await getStoredUser();
        const userId = resolveUserId(user);

        if (cancelled) {
          return;
        }

        setCurrentUserId(userId);

        const response = await communityApi.getState(userId);
        if (cancelled) {
          return;
        }

        applyState(response?.state);
      } catch (error) {
        if (!cancelled) {
          applyState(EMPTY_STATE);
          showToast(error?.message || "Unable to load community data.", "error");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadCommunityState();

    return () => {
      cancelled = true;
    };
  }, []);

  const runMutation = async (mutation, fallbackError) => {
    setIsMutating(true);

    try {
      const response = await mutation();
      applyState(response?.state);
      return true;
    } catch (error) {
      showToast(error?.message || fallbackError, "error");
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const connectedFarmers = farmers.filter((f) => f.status === "connected");
  const incomingRequests = farmers.filter((f) => f.status === "incoming");
  const discoverFarmers = farmers.filter(
    (f) => f.status === "discover" || f.status === "outgoing"
  );

  const acceptRequest = async (farmerId) => {
    await runMutation(
      () =>
        communityApi.respondToRequest({
          user_id: currentUserId,
          farmer_id: farmerId,
          action: "accept",
        }),
      "Unable to accept the request."
    );
  };

  const declineRequest = async (farmerId) => {
    await runMutation(
      () =>
        communityApi.respondToRequest({
          user_id: currentUserId,
          farmer_id: farmerId,
          action: "decline",
        }),
      "Unable to decline the request."
    );
  };

  const sendRequest = async (farmerId) => {
    await runMutation(
      () =>
        communityApi.sendRequest({
          requester_id: currentUserId,
          requested_id: farmerId,
        }),
      "Unable to send the connection request."
    );
  };

  const sendMessage = async (farmerId, text) => {
    const message = (text || "").trim();
    if (!message) {
      return;
    }

    await runMutation(
      () =>
        communityApi.sendMessage({
          sender_id: currentUserId,
          receiver_id: farmerId,
          text: message,
        }),
      "Unable to send the message."
    );
  };

  const navigate = (screen, farmerId = null) => {
    setActiveFarmerId(farmerId);
    setActiveScreen(screen);
  };

  const goBack = () => {
    setActiveFarmerId(null);
    setActiveScreen(SCREEN.HUB);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <AppToast message={toast.message} type={toast.type} />
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={styles.loadingTitle}>Loading community network...</Text>
        <Text style={styles.loadingText}>
          Fetching real requests, connections, and saved chat messages.
        </Text>
      </View>
    );
  }

  if (activeScreen === SCREEN.REQUESTS) {
    return (
      <>
        <AppToast message={toast.message} type={toast.type} />
        <RequestsScreen
          incomingRequests={incomingRequests}
          onAccept={(farmerId) => {
            void acceptRequest(farmerId);
          }}
          onDecline={(farmerId) => {
            void declineRequest(farmerId);
          }}
          onBack={goBack}
          isBusy={isMutating}
        />
      </>
    );
  }

  if (activeScreen === SCREEN.NETWORK) {
    return (
      <>
        <AppToast message={toast.message} type={toast.type} />
        <NetworkScreen
          discoverFarmers={discoverFarmers}
          onSendRequest={(farmerId) => {
            void sendRequest(farmerId);
          }}
          onBack={goBack}
          isBusy={isMutating}
        />
      </>
    );
  }

  if (activeScreen === SCREEN.CHAT) {
    return (
      <>
        <AppToast message={toast.message} type={toast.type} />
        <ChatScreen
          connectedFarmers={connectedFarmers}
          messagesByFarmer={messagesByFarmer}
          initialFarmerId={activeFarmerId}
          onSendMessage={(farmerId, text) => {
            void sendMessage(farmerId, text);
          }}
          onBack={goBack}
          isBusy={isMutating}
        />
      </>
    );
  }

  return (
    <>
      <AppToast message={toast.message} type={toast.type} />
      <CommunityHub
        connectedFarmers={connectedFarmers}
        incomingRequests={incomingRequests}
        discoverFarmers={discoverFarmers}
        onNavigate={navigate}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    backgroundColor: "#f4f6f5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  loadingTitle: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2937",
    textAlign: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#64748b",
    textAlign: "center",
  },
});
