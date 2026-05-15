import { UI_COPY } from "./chatbot-copy";

export const REPLIES = {
  greeting: {
    en: "Namaste. Tell me what you need help with: dairy, cattle health, crop planning, milk quality, payments, fodder, or government schemes.",
    hi: "नमस्ते। आपको किस विषय में मदद चाहिए: डेयरी, पशु स्वास्थ्य, फसल योजना, दूध की गुणवत्ता, पेमेंट, चारा या सरकारी योजना?",
    mr: "नमस्कार. तुम्हाला कोणत्या विषयात मदत हवी आहे: दुग्धव्यवसाय, पशु आरोग्य, पीक नियोजन, दुधाची गुणवत्ता, पेमेंट, चारा की सरकारी योजना?",
  },
  milkPrice: {
    en: "Milk price changes by fat, SNF, union, and local market. Keep a daily rate board for cow and buffalo milk separately, and compare fat-based deductions before selling.",
    hi: "दूध का भाव फैट, एसएनएफ, यूनियन और लोकल मार्केट पर निर्भर करता है। गाय और भैंस के दूध का अलग दैनिक रेट लिखें और बेचने से पहले फैट आधारित कटौती जांचें।",
    mr: "दुधाचा दर फॅट, एसएनएफ, संघ आणि स्थानिक बाजारावर अवलंबून असतो. गायी आणि म्हशीच्या दुधाचे वेगळे दर नोंदवा आणि विक्रीपूर्वी फॅटनुसार कपात तपासा.",
  },
  payment: {
    en: "Keep collection slips, payment dates, litres, fat, and deductions in one record. If payment is delayed, verify the last collection entry, bank status, and any quality-based cut before escalating.",
    hi: "कलेक्शन स्लिप, पेमेंट की तारीख, लीटर, फैट और कटौती का एक रिकॉर्ड रखें। पेमेंट देर से मिले तो पहले आखिरी कलेक्शन एंट्री, बैंक स्थिति और गुणवत्ता आधारित कटौती जांचें।",
    mr: "कलेक्शन स्लिप, पेमेंट तारीख, लिटर, फॅट आणि कपात यांची एकत्र नोंद ठेवा. पेमेंट उशिरा झाल्यास शेवटची नोंद, बँक स्थिती आणि गुणवत्तेनुसार कपात आधी तपासा.",
  },
  feed: {
    en: "For better milk yield, give a balanced ration: green fodder, dry fodder, concentrate, mineral mixture, and clean water. Change feed gradually over 7 to 10 days to avoid digestion stress.",
    hi: "अच्छे दूध उत्पादन के लिए संतुलित आहार दें: हरा चारा, सूखा चारा, दाना, मिनरल मिक्सचर और साफ पानी। आहार को 7 से 10 दिनों में धीरे-धीरे बदलें।",
    mr: "दूध उत्पादन वाढवण्यासाठी संतुलित आहार द्या: हिरवा चारा, सुका चारा, दाणा, मिनरल मिक्सचर आणि स्वच्छ पाणी. चारा 7 ते 10 दिवसांत हळूहळू बदला.",
  },
  milkQuality: {
    en: "To improve milk quality, wash udders before milking, use clean cans, cool milk quickly, and avoid mixing old milk with fresh milk. Regularly track fat, SNF, and souring complaints.",
    hi: "दूध की गुणवत्ता सुधारने के लिए दूध निकालने से पहले थन साफ करें, साफ कैन का उपयोग करें, दूध को जल्दी ठंडा करें और पुराने दूध को ताजे दूध में न मिलाएँ। फैट, एसएनएफ और खट्टापन शिकायतें नियमित रूप से दर्ज करें।",
    mr: "दुधाची गुणवत्ता सुधारण्यासाठी दूध काढण्यापूर्वी थन स्वच्छ करा, स्वच्छ कॅन वापरा, दूध लवकर थंड करा आणि जुने दूध ताज्या दुधात मिसळू नका. फॅट, एसएनएफ आणि आंबट होण्याच्या तक्रारी नियमित नोंदवा.",
  },
  fallback: {
    en: "I can answer a wider set of farm questions now: dairy, cattle care, feed, disease, milk quality, payments, loans, schemes, manure, fodder, and crop support. Ask your question in simple words and include the animal, crop, or problem.",
    hi: "मैं अब डेयरी और खेती से जुड़े कई सवालों में मदद कर सकता हूँ। सवाल सरल शब्दों में पूछिए और पशु, फसल या समस्या का नाम बताइए।",
    mr: "मी आता डेयरी आणि शेतीसंबंधित अनेक प्रश्नांवर मदत करू शकतो. प्रश्न सोप्या शब्दांत विचारा आणि जनावर, पीक किंवा समस्या स्पष्ट लिहा.",
  },
};

const FOLLOW_UP_HINTS = ["more", "details", "what else", "aankhi", "aur", "pudhe"];

export const INTENTS = [
  { key: "greeting", match: ["hello", "hi", "namaste", "namaskar", "hey"] },
  { key: "milkPrice", match: ["price", "rate", "milk price", "milk rate", "bhav", "dar"] },
  { key: "payment", match: ["payment", "paid", "bill", "money", "pement", "bhugtan", "rakkam"] },
  { key: "feed", match: ["feed", "fodder mix", "ration", "chara", "khurak", "aahar", "dana"] },
  { key: "milkQuality", match: ["quality", "milk quality", "clean milk", "gunvatta", "dudh quality"] },
];

export function detectLanguage(message, selectedLanguage) {
  const text = message.trim().toLowerCase();

  if (/[^\u0000-\u007F]/.test(text)) {
    return selectedLanguage === "mr" ? "mr" : "hi";
  }

  return selectedLanguage;
}

function getLastMatchedIntent(history) {
  const previousUserMessages = [...history]
    .reverse()
    .filter((item) => item.role === "user")
    .map((item) => item.text.toLowerCase());

  for (const previousMessage of previousUserMessages) {
    const match = INTENTS.find((intent) =>
      intent.match.some((keyword) => previousMessage.includes(keyword.toLowerCase()))
    );

    if (match) {
      return match.key;
    }
  }

  return null;
}

export function getBotReply(message, language, history) {
  const text = message.toLowerCase();
  const matchedIntent = INTENTS.find((intent) =>
    intent.match.some((keyword) => text.includes(keyword.toLowerCase()))
  );

  const followUpIntent =
    matchedIntent?.key ||
    (FOLLOW_UP_HINTS.some((hint) => text.includes(hint)) && getLastMatchedIntent(history));

  return REPLIES[followUpIntent || "fallback"][language];
}

export function getReplyIntent(message, history) {
  const text = message.toLowerCase();
  const matchedIntent = INTENTS.find((intent) =>
    intent.match.some((keyword) => text.includes(keyword.toLowerCase()))
  );

  return (
    matchedIntent?.key ||
    (FOLLOW_UP_HINTS.some((hint) => text.includes(hint)) && getLastMatchedIntent(history)) ||
    "fallback"
  );
}

export function getReplyText(intentKey, language) {
  if (intentKey === "welcome") {
    return UI_COPY[language].welcome;
  }

  return REPLIES[intentKey]?.[language] || REPLIES.fallback[language];
}

export function buildWelcomeMessage(language) {
  return {
    role: "bot",
    type: "welcome",
  };
}
