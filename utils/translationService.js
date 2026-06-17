import { translate } from "google-translate-api-x";

export const translateText = async (text, targetLanguage) => {
  try {
    if (targetLanguage === "en") {
      return text; // Return original if target is English
    }

    const result = await translate(text, {
      to: targetLanguage,
    });

    return result.text;
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error("Translation failed");
  }
};

export const translateToMultipleLanguages = async (text, languages) => {
  const translations = [];

  for (const lang of languages) {
    try {
      const translatedText = await translateText(text, lang);
      translations.push({
        language: lang,
        text: translatedText,
      });
    } catch (error) {
      console.error(`Failed to translate to ${lang}:`, error);
    }
  }

  return translations;
};
