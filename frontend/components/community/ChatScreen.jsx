import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ProfileAvatar from "../profile-avatar";

function BackHeader({ onBack, title, subtitle }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={20} color="#2e7d32" />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.headerRight} />
    </View>
  );
}

function FarmerListItem({ farmer, unreadCount, lastMessage, onPress }) {
  return (
    <TouchableOpacity style={styles.farmerListItem} activeOpacity={0.85} onPress={onPress}>
      <ProfileAvatar
        uri={farmer.profile_image}
        name={farmer.name}
        size={50}
        borderRadius={18}
        backgroundColor="#edf8ee"
        textColor="#2e7d32"
      />
      <View style={styles.farmerListInfo}>
        <View style={styles.farmerListTop}>
          <Text style={styles.farmerListName}>{farmer.name}</Text>
          <View style={styles.onlineDot} />
        </View>
        <Text style={styles.farmerListVillage}>{farmer.village}</Text>
        {lastMessage ? (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {lastMessage.sender === "me" ? "You: " : ""}
            {lastMessage.text}
          </Text>
        ) : (
          <Text style={styles.lastMessage}>Tap to start chatting</Text>
        )}
      </View>
      <View style={styles.farmerListMeta}>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color="#94a3b8" style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  );
}

function ChatView({ farmer, messages, onSendMessage, onBack, isBusy }) {
  const [draft, setDraft] = useState("");
  const [imageModal, setImageModal] = useState(false);
  const scrollRef = useRef(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => sub.remove();
  }, []);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || isBusy) {
      return;
    }

    onSendMessage(farmer.id, text);
    setDraft("");
  };

  return (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Full-screen profile image modal */}
      <Modal visible={imageModal} transparent animationType="fade" onRequestClose={() => setImageModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setImageModal(false)}>
          {farmer.profile_image ? (
            <Image source={{ uri: farmer.profile_image }} style={styles.modalImage} resizeMode="contain" />
          ) : (
            <ProfileAvatar
              name={farmer.name}
              size={200}
              borderRadius={36}
              backgroundColor="#edf8ee"
              textColor="#2e7d32"
            />
          )}
          <Text style={styles.modalClose}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>

      <View style={[styles.chatHeader, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#2e7d32" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setImageModal(true)} activeOpacity={0.85}>
          <ProfileAvatar
            uri={farmer.profile_image}
            name={farmer.name}
            size={42}
            borderRadius={14}
            backgroundColor="#edf8ee"
            textColor="#2e7d32"
            borderWidth={2}
            borderColor="#d4ebd4"
          />
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderName}>{farmer.name}</Text>
          <Text style={styles.chatHeaderSub}>
            {farmer.village} - {farmer.lastSeen}
          </Text>
        </View>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Connected</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messagesArea}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dateSeparator}>
          <View style={styles.dateLine} />
          <Text style={styles.dateLabel}>Today</Text>
          <View style={styles.dateLine} />
        </View>

        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.bubbleWrap,
              msg.sender === "me" ? styles.myBubbleWrap : styles.theirBubbleWrap,
            ]}
          >
            <View
              style={[
                styles.bubble,
                msg.sender === "me" ? styles.myBubble : styles.theirBubble,
              ]}
            >
              <Text style={styles.bubbleText}>{msg.text}</Text>
            </View>
            <Text
              style={[
                styles.bubbleTime,
                msg.sender === "me" ? styles.myBubbleTime : styles.theirBubbleTime,
              ]}
            >
              {msg.time}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message..."
          placeholderTextColor="#94a3b8"
          style={styles.composerInput}
          multiline
          maxLength={500}
          editable={!isBusy}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!draft.trim() || isBusy) && styles.sendBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleSend}
          disabled={!draft.trim() || isBusy}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function ChatScreen({
  connectedFarmers,
  messagesByFarmer,
  initialFarmerId,
  onSendMessage,
  onBack,
  isBusy = false,
}) {
  const [selectedFarmerId, setSelectedFarmerId] = useState(initialFarmerId);

  const selectedFarmer = selectedFarmerId
    ? connectedFarmers.find((f) => f.id === selectedFarmerId)
    : null;

  if (selectedFarmer) {
    return (
      <ChatView
        farmer={selectedFarmer}
        messages={messagesByFarmer[selectedFarmer.id] || []}
        onSendMessage={onSendMessage}
        onBack={() => setSelectedFarmerId(null)}
        isBusy={isBusy}
      />
    );
  }

  return (
    <View style={styles.container}>
      <BackHeader
        onBack={onBack}
        title="Community Chats"
        subtitle={`${connectedFarmers.length} connections`}
      />

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: "#edf8ee" }]}>
            <Ionicons name="people" size={22} color="#2e7d32" />
            <Text style={[styles.statNum, { color: "#2e7d32" }]}>{connectedFarmers.length}</Text>
            <Text style={styles.statLabel}>Connected</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#e8f4ff" }]}>
            <Ionicons name="chatbubbles" size={22} color="#1565c0" />
            <Text style={[styles.statNum, { color: "#1565c0" }]}>
              {Object.keys(messagesByFarmer).length}
            </Text>
            <Text style={styles.statLabel}>Active Chats</Text>
          </View>
        </View>

        {connectedFarmers.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Your Connections</Text>
            {connectedFarmers.map((farmer) => {
              const msgs = messagesByFarmer[farmer.id] || [];
              const lastMsg = msgs[msgs.length - 1] || null;

              return (
                <FarmerListItem
                  key={farmer.id}
                  farmer={farmer}
                  lastMessage={lastMsg}
                  unreadCount={0}
                  onPress={() => setSelectedFarmerId(farmer.id)}
                />
              );
            })}
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="chatbubbles-outline" size={40} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>No chats yet</Text>
            <Text style={styles.emptyText}>
              Accept a connection request or send one to start community conversations.
            </Text>
          </View>
        )}

        <View style={styles.tipCard}>
          <View style={styles.tipRow}>
            <Ionicons name="bulb" size={16} color="#f59e0b" />
            <Text style={styles.tipTitle}>Start a conversation</Text>
          </View>
          <Text style={styles.tipText}>
            Share your daily milk yield, ask about cattle health remedies, or discuss
            seasonal feed pricing with your farming network.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#eef7ee",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#d4ebd4",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#d4ebd4",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, paddingHorizontal: 12 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1f2937" },
  headerSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },
  headerRight: { width: 40 },
  listContent: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 18 },
  statCard: { flex: 1, borderRadius: 20, padding: 16, alignItems: "center", gap: 4 },
  statNum: { fontSize: 28, fontWeight: "800" },
  statLabel: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#1f2937", marginBottom: 12 },
  farmerListItem: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    shadowColor: "#c0d4c0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
    gap: 12,
  },
  farmerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: "#edf8ee",
    alignItems: "center",
    justifyContent: "center",
  },
  farmerListInfo: { flex: 1 },
  farmerListTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  farmerListName: { fontSize: 15, fontWeight: "800", color: "#1f2937" },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2e7d32",
  },
  farmerListVillage: { fontSize: 12, color: "#64748b", marginBottom: 3 },
  lastMessage: { fontSize: 12, color: "#94a3b8", lineHeight: 17 },
  farmerListMeta: { alignItems: "flex-end" },
  unreadBadge: {
    backgroundColor: "#2e7d32",
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    marginBottom: 4,
  },
  unreadBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#1f2937", marginBottom: 8 },
  emptyText: { fontSize: 14, lineHeight: 20, color: "#64748b", textAlign: "center" },
  tipCard: {
    backgroundColor: "#fffbeb",
    borderRadius: 20,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  tipTitle: { fontSize: 13, fontWeight: "800", color: "#92400e" },
  tipText: { fontSize: 13, lineHeight: 19, color: "#78350f" },
  chatContainer: { flex: 1, backgroundColor: "#f4f6f5" },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eef7ee",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#d4ebd4",
    gap: 10,
  },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#edf8ee",
    alignItems: "center",
    justifyContent: "center",
  },
  chatHeaderInfo: { flex: 1 },
  chatHeaderName: { fontSize: 16, fontWeight: "800", color: "#1f2937" },
  chatHeaderSub: { fontSize: 11, color: "#64748b", marginTop: 1 },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#edf8ee",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 5,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#2e7d32" },
  liveText: { fontSize: 11, fontWeight: "800", color: "#2e7d32" },
  messagesArea: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 12 },
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  dateLabel: { fontSize: 12, fontWeight: "700", color: "#94a3b8" },
  bubbleWrap: { marginBottom: 12 },
  myBubbleWrap: { alignItems: "flex-end" },
  theirBubbleWrap: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "82%",
    borderRadius: 18,
    padding: 12,
  },
  myBubble: {
    backgroundColor: "#d1fae5",
    borderBottomRightRadius: 6,
  },
  theirBubble: {
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 6,
    shadowColor: "#c0d4c0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  bubbleText: { fontSize: 14, lineHeight: 20, color: "#1f2937" },
  bubbleTime: { fontSize: 11, fontWeight: "600", marginTop: 4 },
  myBubbleTime: { color: "#4b9a6e", textAlign: "right" },
  theirBubbleTime: { color: "#94a3b8" },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#fff",
    margin: 12,
    borderRadius: 20,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    shadowColor: "#c0d4c0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    gap: 8,
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    fontSize: 14,
    color: "#1f2937",
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#2e7d32",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#a7c4a7" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalImage: {
    width: 280,
    height: 280,
    borderRadius: 28,
  },
  modalClose: {
    marginTop: 18,
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "600",
  },
});
