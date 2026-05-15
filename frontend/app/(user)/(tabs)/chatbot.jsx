import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AppToast from "../../../components/app-toast";
import useToast from "../../../components/use-toast";
import {
  LANGUAGE_LABELS,
  LANGUAGE_VOICES,
  QUICK_QUESTION_COPY,
  UI_COPY,
} from "../../../components/chatbot-copy";
import {
  detectLanguage,
  getReplyIntent,
  getReplyText,
} from "../../../components/chatbot-knowledge";
import { speakText, stopSpeaking } from "../../../components/tts-service";
import { aiApi, getStoredUser } from "../../../utils/api";

const createClientId = (prefix = "msg") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const resolveUserId = (user) =>
  user?.user_id || user?.email || user?.name?.trim() || "guest";

const normalizeDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
};

const normalizeRole = (role) => {
  const value = (role || "").trim().toLowerCase();

  if (value === "assistant" || value === "system") {
    return "bot";
  }

  if (value === "typing") {
    return "typing";
  }

  return value === "user" ? "user" : "bot";
};

const ensureUniqueMessages = (items) => {
  const seenIds = new Set();

  return (items || []).map((item, index) => {
    const baseId = String(
      item?.id || item?.message_id || createClientId(item?.role || `msg-${index}`)
    );
    let nextId = baseId;
    let duplicateCount = 1;

    while (seenIds.has(nextId)) {
      nextId = `${baseId}-${duplicateCount}`;
      duplicateCount += 1;
    }

    seenIds.add(nextId);

    return {
      ...item,
      id: nextId,
      role: normalizeRole(item?.role),
      text: typeof item?.text === "string" ? item.text : "",
      ts: normalizeDate(item?.ts || item?.created_at),
    };
  });
};

const buildWelcomeMessage = (language) => ({
  id: createClientId("bot"),
  role: "bot",
  text: (UI_COPY[language] || UI_COPY.en).welcome,
  ts: new Date(),
});

const normalizeChat = (chat) => {
  const normalizedMessages = ensureUniqueMessages(
    (chat?.messages || []).map((message) => ({
      id: message?.message_id || message?.id,
      role: message?.role,
      text: message?.text || "",
      created_at: message?.created_at,
    }))
  );

  const updatedAt = normalizeDate(chat?.updated_at).toISOString();
  const createdAt = normalizeDate(chat?.created_at || chat?.updated_at).toISOString();

  return {
    id: chat?.id || createClientId("chat"),
    title: (chat?.title || "New Chat").trim() || "New Chat",
    language: chat?.language || "en",
    created_at: createdAt,
    updated_at: updatedAt,
    message_count: chat?.message_count ?? normalizedMessages.length,
    last_message:
      chat?.last_message ||
      normalizedMessages[normalizedMessages.length - 1]?.text ||
      "",
    messages: normalizedMessages,
  };
};

const sortChats = (items) =>
  [...items].sort(
    (a, b) =>
      normalizeDate(b?.updated_at).getTime() -
      normalizeDate(a?.updated_at).getTime()
  );

const upsertChat = (items, nextChat) => {
  const normalizedChat = normalizeChat(nextChat);
  const remainingChats = (items || []).filter((item) => item.id !== normalizedChat.id);
  return sortChats([normalizedChat, ...remainingChats]);
};

function TypingIndicator() {
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const d3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = (val, delay) => {
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(val, {
              toValue: 1,
              duration: 320,
              useNativeDriver: true,
            }),
            Animated.timing(val, {
              toValue: 0,
              duration: 320,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }, delay);
    };

    bounce(d1, 0);
    bounce(d2, 180);
    bounce(d3, 360);
  }, [d1, d2, d3]);

  const lift = (val) => ({
    transform: [
      {
        translateY: val.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -7],
        }),
      },
    ],
    opacity: val.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.4, 1, 0.4],
    }),
  });

  return (
    <View style={styles.msgRow}>
      <View style={styles.botAvatar}>
        <Ionicons name="leaf" size={13} color="#fff" />
      </View>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, lift(d1)]} />
        <Animated.View style={[styles.typingDot, lift(d2)]} />
        <Animated.View style={[styles.typingDot, lift(d3)]} />
      </View>
    </View>
  );
}

export default function ChatbotScreen() {
  const [lang, setLang] = useState("en");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isSwitchingChat, setIsSwitchingChat] = useState(false);

  const { toast, showToast } = useToast();
  const flatRef = useRef(null);
  const inputRef = useRef(null);

  const copy = UI_COPY[lang] || UI_COPY.en;
  const langLabels = LANGUAGE_LABELS[lang] || LANGUAGE_LABELS.en;
  const quickQs = Object.entries(QUICK_QUESTION_COPY).map(([key, val]) => ({
    key,
    text: val[lang] || val.en,
  }));
  const isBusy = isLoadingChats || isSwitchingChat || isSending;

  useEffect(() => {
    return () => {
      void stopSpeaking();
    };
  }, []);

  const clean = (text) =>
    (text || "")
      .replace(/^[*\-\u2022]\s+/gm, "")
      .replace(/^\d+\.\s+/gm, "")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/\s+/g, " ")
      .trim();

  const stopSpeak = async () => {
    await stopSpeaking();
    setSpeakingId(null);
  };

  const toggleSpeak = async (id, text) => {
    if (speakingId === id) {
      await stopSpeak();
      return;
    }

    await stopSpeaking();
    setSpeakingId(id);

    try {
      const started = await speakText(clean(text), lang, {
        onDone: () => setSpeakingId(null),
        onError: () => setSpeakingId(null),
      });

      if (!started) {
        setSpeakingId(null);
      }
    } catch (error) {
      console.warn("Unable to start ElevenLabs playback.", error);
      setSpeakingId(null);
    }
  };

  const applyChatState = (chat) => {
    const normalizedChat = normalizeChat(chat);
    const nextMessages = normalizedChat.messages.length
      ? normalizedChat.messages
      : [buildWelcomeMessage(normalizedChat.language || lang)];

    setActiveChatId(normalizedChat.id);
    setMessages(nextMessages);
    setChats((prev) => upsertChat(prev, { ...normalizedChat, messages: nextMessages }));

    if (normalizedChat.language && normalizedChat.language !== lang) {
      setLang(normalizedChat.language);
    }

    return { ...normalizedChat, messages: nextMessages };
  };

  useEffect(() => {
    let cancelled = false;

    const initializeChats = async () => {
      setIsLoadingChats(true);

      try {
        const user = await getStoredUser();
        const userId = resolveUserId(user);
        if (cancelled) {
          return;
        }

        setCurrentUserId(userId);

        const listResponse = await aiApi.listChats(userId);
        if (cancelled) {
          return;
        }

        const listedChats = sortChats((listResponse?.chats || []).map(normalizeChat));
        setChats(listedChats);

        if (listedChats.length > 0) {
          const activeChatResponse = await aiApi.getChat(listedChats[0].id, userId);
          if (cancelled) {
            return;
          }

          applyChatState(activeChatResponse?.chat || listedChats[0]);
          return;
        }

        const welcomeText = UI_COPY.en.welcome;
        const createResponse = await aiApi.createChat({
          farmer_id: userId,
          language: "en",
          title: "New Chat",
          welcome_text: welcomeText,
        });

        if (cancelled) {
          return;
        }

        applyChatState(createResponse?.chat);
      } catch (error) {
        if (!cancelled) {
          setMessages([buildWelcomeMessage(lang)]);
          showToast(error?.message || "Unable to load saved chats.", "error");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingChats(false);
        }
      }
    };

    void initializeChats();

    return () => {
      cancelled = true;
    };
  }, []);

  const ensureUserId = async () => {
    if (currentUserId) {
      return currentUserId;
    }

    const user = await getStoredUser();
    const userId = resolveUserId(user);
    setCurrentUserId(userId);
    return userId;
  };

  const createNewChat = async () => {
    setIsSwitchingChat(true);
    await stopSpeak();

    try {
      const userId = await ensureUserId();
      const welcomeText = (UI_COPY[lang] || UI_COPY.en).welcome;
      const response = await aiApi.createChat({
        farmer_id: userId,
        language: lang,
        title: "New Chat",
        welcome_text: welcomeText,
      });

      const chat = applyChatState(response?.chat);
      inputRef.current?.focus?.();
      return chat;
    } catch (error) {
      setActiveChatId("");
      setMessages([buildWelcomeMessage(lang)]);
      showToast(error?.message || "Unable to create a new chat.", "error");
      return null;
    } finally {
      setIsSwitchingChat(false);
    }
  };

  const openChat = async (chatId) => {
    if (!chatId || (chatId === activeChatId && messages.length > 0)) {
      return;
    }

    setIsSwitchingChat(true);
    await stopSpeak();

    try {
      const userId = await ensureUserId();
      const response = await aiApi.getChat(chatId, userId);
      applyChatState(response?.chat);
    } catch (error) {
      showToast(error?.message || "Unable to open this chat.", "error");
    } finally {
      setIsSwitchingChat(false);
    }
  };

  const startVoice = () => {
    if (Platform.OS !== "web") {
      showToast(copy.micUnavailable, "warning");
      return;
    }

    const SpeechRecognitionCtor =
      globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      showToast(copy.micUnavailable, "error");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = LANGUAGE_VOICES[lang];
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      showToast(copy.micUnavailable, "error");
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results || [])
        .map((result) => result?.[0]?.transcript || "")
        .join(" ")
        .trim();

      if (transcript) {
        setInput(transcript);
      }
    };

    recognition.start();
  };

  const sendMessage = async (rawText) => {
    const message = (rawText || "").trim();
    if (!message || isBusy) {
      return;
    }

    await stopSpeak();

    let userId = currentUserId;
    let chatId = activeChatId;
    let baseMessages = messages.filter((item) => item.role !== "typing");

    if (!userId) {
      userId = await ensureUserId();
    }

    if (!chatId) {
      const createdChat = await createNewChat();
      chatId = createdChat?.id || "";
      baseMessages = createdChat?.messages || [];

      if (!chatId) {
        return;
      }
    }

    const replyLang = detectLanguage(message, lang);
    const intent = getReplyIntent(message, baseMessages);
    const localReply = clean(getReplyText(intent, replyLang));
    const userMessage = {
      id: createClientId("user"),
      role: "user",
      text: message,
      ts: new Date(),
    };
    const typingMessage = {
      id: createClientId("typing"),
      role: "typing",
      ts: new Date(),
    };
    const optimisticMessages = ensureUniqueMessages([
      ...baseMessages,
      userMessage,
      typingMessage,
    ]);

    setMessages(optimisticMessages);
    setInput("");
    setIsSending(true);

    try {
      const response = await aiApi.chat({
        message,
        chat_id: chatId,
        farmer_id: userId,
        language: lang,
        history: [...baseMessages, userMessage]
          .filter((item) => item.role !== "typing" && item.text)
          .slice(-6)
          .map((item) => ({ role: item.role, text: item.text })),
      });

      const updatedChat = applyChatState(response?.chat);
      const lastBotMessage = [...updatedChat.messages]
        .reverse()
        .find((item) => item.role === "bot" && item.text);

      if (autoSpeak && lastBotMessage) {
        setTimeout(() => {
          void toggleSpeak(lastBotMessage.id, lastBotMessage.text);
        }, 120);
      }
    } catch (error) {
      const fallbackBotMessage = {
        id: createClientId("bot"),
        role: "bot",
        text: localReply,
        ts: new Date(),
      };
      const fallbackMessages = ensureUniqueMessages([
        ...baseMessages,
        userMessage,
        fallbackBotMessage,
      ]);

      setMessages(fallbackMessages);
      setChats((prev) => {
        const existingChat = prev.find((item) => item.id === chatId);
        if (!existingChat) {
          return prev;
        }

        return upsertChat(prev, {
          ...existingChat,
          messages: fallbackMessages,
          message_count: fallbackMessages.length,
          last_message: fallbackBotMessage.text,
          updated_at: new Date().toISOString(),
        });
      });

      showToast(
        error?.message || "Couldn't sync chat. Showing a local reply instead.",
        "warning"
      );

      if (autoSpeak) {
        setTimeout(() => {
          void toggleSpeak(fallbackBotMessage.id, fallbackBotMessage.text);
        }, 120);
      }
    } finally {
      setIsSending(false);
    }
  };

  const fmt = (value) => {
    const date = normalizeDate(value);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderItem = ({ item }) => {
    if (item.role === "typing") {
      return <TypingIndicator />;
    }

    const isUser = item.role === "user";
    const speaking = speakingId === item.id;

    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <Ionicons name="leaf" size={13} color="#fff" />
          </View>
        )}

        <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
          <Text style={[styles.bubbleText, isUser ? styles.userText : styles.botText]}>
            {item.text}
          </Text>

          <View style={styles.bubbleFoot}>
            <Text style={[styles.ts, isUser ? styles.tsUser : styles.tsBot]}>
              {fmt(item.ts)}
            </Text>

            {!isUser && (
              <TouchableOpacity
                onPress={() => {
                  void toggleSpeak(item.id, item.text);
                }}
                style={styles.speakBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={speaking ? "pause-circle" : "volume-medium-outline"}
                  size={15}
                  color={speaking ? "#2e7d32" : "#9ca3af"}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isUser && <View style={styles.userSpacer} />}
      </View>
    );
  };

  const canSend = input.trim().length > 0 && !isBusy;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <AppToast message={toast.message} type={toast.type} />

      <View style={styles.langBar}>
        <View style={styles.langChips}>
          {Object.entries(langLabels).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.langChip, lang === key && styles.langChipOn]}
              onPress={() => setLang(key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.langChipTxt, lang === key && styles.langChipTxtOn]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.muteBtn, autoSpeak && styles.muteBtnActive]}
          onPress={() => setAutoSpeak((value) => !value)}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={autoSpeak ? "volume-high" : "volume-mute-outline"}
            size={17}
            color={autoSpeak ? "#fff" : "#6b7280"}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.sessionBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sessionContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.newChatChip}
            onPress={() => {
              void createNewChat();
            }}
            activeOpacity={0.82}
            disabled={isBusy}
          >
            <Ionicons name="add" size={15} color="#166534" />
            <Text style={styles.newChatChipText}>New Chat</Text>
          </TouchableOpacity>

          {chats.map((chat) => {
            const isActive = chat.id === activeChatId;

            return (
              <TouchableOpacity
                key={chat.id}
                style={[styles.sessionChip, isActive && styles.sessionChipActive]}
                onPress={() => {
                  void openChat(chat.id);
                }}
                activeOpacity={0.82}
                disabled={isSwitchingChat}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.sessionChipTitle,
                    isActive && styles.sessionChipTitleActive,
                  ]}
                >
                  {chat.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.sessionChipMeta,
                    isActive && styles.sessionChipMetaActive,
                  ]}
                >
                  {chat.last_message || `${chat.message_count || 0} messages`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {isLoadingChats ? "Loading saved chats..." : "Start a new chat to ask anything."}
            </Text>
            <Text style={styles.emptyText}>
              {isLoadingChats
                ? "Fetching your previous conversations."
                : "Your replies will be grouped and stored chat-wise."}
            </Text>
          </View>
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickBar}
        contentContainerStyle={styles.quickContent}
        keyboardShouldPersistTaps="handled"
      >
        {quickQs.map((q) => (
          <TouchableOpacity
            key={q.key}
            style={styles.quickChip}
            onPress={() => {
              void sendMessage(q.text);
            }}
            activeOpacity={0.75}
            disabled={isBusy}
          >
            <Text style={styles.quickChipTxt}>{q.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.inputBar}>
        <TouchableOpacity
          style={[styles.micBtn, isListening && styles.micBtnActive]}
          onPress={startVoice}
          activeOpacity={0.8}
          disabled={isBusy}
        >
          <Ionicons
            name={isListening ? "stop-circle" : "mic"}
            size={19}
            color={isListening ? "#fff" : "#6b7280"}
          />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={styles.textInput}
          placeholder={copy.placeholder}
          placeholderTextColor="#94a3b8"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => {
            void sendMessage(input);
          }}
          multiline
          maxLength={1000}
          editable={!isBusy}
          blurOnSubmit={false}
        />

        <TouchableOpacity
          style={[styles.sendBtn, !canSend && styles.sendBtnOff]}
          onPress={() => {
            void sendMessage(input);
          }}
          activeOpacity={0.8}
          disabled={!canSend}
        >
          {isSending ? (
            <Ionicons name="ellipsis-horizontal" size={18} color="#fff" />
          ) : (
            <Ionicons name="send" size={16} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f0f2f5",
  },
  langBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  langChips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  langChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
  },
  langChipOn: {
    backgroundColor: "#2e7d32",
  },
  langChipTxt: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  langChipTxtOn: {
    color: "#fff",
  },
  muteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  muteBtnActive: {
    backgroundColor: "#2e7d32",
  },
  sessionBar: {
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  sessionContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    alignItems: "stretch",
  },
  newChatChip: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: "#86efac",
  },
  newChatChipText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "700",
  },
  sessionChip: {
    width: 150,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    justifyContent: "center",
  },
  sessionChipActive: {
    backgroundColor: "#2e7d32",
    borderColor: "#2e7d32",
  },
  sessionChipTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  sessionChipTitleActive: {
    color: "#fff",
  },
  sessionChipMeta: {
    marginTop: 4,
    fontSize: 11,
    color: "#6b7280",
  },
  sessionChipMetaActive: {
    color: "rgba(255,255,255,0.8)",
  },
  msgList: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexGrow: 1,
  },
  emptyState: {
    paddingTop: 72,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: "#6b7280",
    textAlign: "center",
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  msgRowLeft: {
    justifyContent: "flex-start",
  },
  msgRowRight: {
    justifyContent: "flex-end",
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2e7d32",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    flexShrink: 0,
    alignSelf: "flex-end",
    marginBottom: 2,
  },
  userSpacer: {
    width: 34,
    flexShrink: 0,
  },
  bubble: {
    maxWidth: "76%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 7,
  },
  userBubble: {
    backgroundColor: "#2e7d32",
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: "#fff",
  },
  botText: {
    color: "#111827",
  },
  bubbleFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 6,
  },
  ts: {
    fontSize: 11,
  },
  tsUser: {
    color: "rgba(255,255,255,0.65)",
  },
  tsBot: {
    color: "#9ca3af",
  },
  speakBtn: {
    padding: 1,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#9ca3af",
  },
  quickBar: {
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e7eb",
  },
  quickContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#86efac",
    flexShrink: 0,
  },
  quickChipTxt: {
    fontSize: 13,
    color: "#166534",
    fontWeight: "600",
    lineHeight: 18,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 8,
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e7eb",
    gap: 8,
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  micBtnActive: {
    backgroundColor: "#ef4444",
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 11 : 9,
    paddingBottom: 9,
    fontSize: 15,
    color: "#111827",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2e7d32",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendBtnOff: {
    backgroundColor: "#a7d9a7",
  },
});
