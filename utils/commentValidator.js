// Validation utility for comments

export const containsBlockedSpecialCharacters = (text) => {
  // Only allow: alphanumeric, spaces, and safe punctuation (. , ! ? ' " - ( ) [ ])
  // Block: @ # $ % & * + = ~ ` | < > / \ { } and other harmful characters
  const allowedPattern = /^[a-zA-Z0-9\s\.\,\!\?\'\"\"-\(\)\[\]\u0080-\uFFFF]*$/;
  
  return !allowedPattern.test(text);
};

export const detectLanguage = async (text) => {
  // Simple language detection based on character patterns
  // In production, you might want to use a dedicated library like 'langdetect'
  
  // Check for common language patterns
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh"; // Chinese
  if (/[\u0600-\u06FF]/.test(text)) return "ar"; // Arabic
  if (/[\u0400-\u04FF]/.test(text)) return "ru"; // Russian
  if (/[\u0900-\u097F]/.test(text)) return "hi"; // Hindi
  if (/[\u1000-\u109F]/.test(text)) return "my"; // Myanmar
  if (/[\u0E00-\u0E7F]/.test(text)) return "th"; // Thai
  if (/[\u0600-\u06FF][\u064B-\u0655]*/.test(text)) return "ur"; // Urdu
  
  // Default to English
  return "en";
};

export const validateComment = (commentbody) => {
  const errors = [];

  // Check if comment is empty
  if (!commentbody || commentbody.trim().length === 0) {
    errors.push("Comment cannot be empty");
  }

  // Check for blocked special characters
  if (containsBlockedSpecialCharacters(commentbody)) {
    errors.push("Comment contains blocked special characters. Only allowed: . , ! ? ' \" - ( ) [ ]");
  }

  // Check length (optional: max 5000 characters)
  if (commentbody.length > 5000) {
    errors.push("Comment is too long (max 5000 characters)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
