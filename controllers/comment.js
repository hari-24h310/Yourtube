import comment from "../Models/comment.js";
import user from "../Models/Auth.js";
import mongoose from "mongoose";
import { validateComment } from "../utils/commentValidator.js";
import { translateText } from "../utils/translationService.js";
import { getUserLocation } from "../utils/geolocationService.js";

export const postcomment = async (req, res) => {
  const { userid, videoid, commentbody, userCity, userLanguage, usercommented } = req.body;

  // Validate comment
  const validation = validateComment(commentbody);
  if (!validation.isValid) {
    return res.status(400).json({
      error: true,
      message: validation.errors.join(", "),
    });
  }

  try {
    // Fetch user data if exists (for registered users)
    let userName = usercommented || "Anonymous";
    let userCityName = userCity || "Unknown";

    if (!userid.startsWith("guest-")) {
      const userData = await user.findById(userid);
      if (userData) {
        userName = userData.name || usercommented || "Anonymous";
        userCityName = userData.city || userCity || "Unknown";
      }
    }

    // Fallback to server-side IP geolocation when frontend did not supply a city
    if (!userCityName || userCityName === "Unknown") {
      const forwardedIp = req.headers["x-forwarded-for"]?.toString().split(",")[0];
      const clientIp = forwardedIp || req.ip || req.socket?.remoteAddress || "127.0.0.1";
      try {
        const location = await getUserLocation(clientIp);
        if (location?.city && location.city !== "Unknown") {
          userCityName = location.city;
        }
      } catch (locationError) {
        console.log("City lookup failed:", locationError.message);
      }
    }

    // Create new comment
    const postcomment = new comment({
      userid,
      videoid,
      commentbody,
      usercommented: userName,
      userCity: userCityName,
      userLanguage: userLanguage || "en",
      likes: 0,
      dislikes: 0,
      status: "active",
    });

    await postcomment.save();
    return res.status(200).json({ comment: true, data: postcomment });
  } catch (error) {
    console.error("Error posting comment:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment
      .find({ videoid: videoid, status: "active" })
      .populate("userid", "name image city");
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }

  // Validate comment
  const validation = validateComment(commentbody);
  if (!validation.isValid) {
    return res.status(400).json({
      error: true,
      message: validation.errors.join(", "),
    });
  }

  try {
    const updatecomment = await comment.findByIdAndUpdate(_id, {
      $set: { commentbody: commentbody },
    });
    res.status(200).json(updatecomment);
  } catch (error) {
    console.error("Error editing comment:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const likecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({ message: "Comment not found" });
  }

  try {
    const updatedComment = await comment.findByIdAndUpdate(
      _id,
      { $inc: { likes: 1 } },
      { new: true }
    );
    res.status(200).json(updatedComment);
  } catch (error) {
    console.error("Error liking comment:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const dislikecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({ message: "Comment not found" });
  }

  try {
    // Increment dislike count
    const updatedComment = await comment.findByIdAndUpdate(
      _id,
      { $inc: { dislikes: 1 } },
      { new: true }
    );

    // If dislikes reach 2, mark comment as blocked and update status
    if (updatedComment.dislikes >= 2) {
      await comment.findByIdAndUpdate(
        _id,
        { $set: { status: "blocked" } },
        { new: true }
      );
      return res.status(200).json({
        message: "Comment has been removed due to multiple dislikes",
        removed: true,
      });
    }

    res.status(200).json(updatedComment);
  } catch (error) {
    console.error("Error disliking comment:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const translatecomment = async (req, res) => {
  const { id: _id } = req.params;
  const { targetLanguage } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({ message: "Comment not found" });
  }

  if (!targetLanguage) {
    return res.status(400).json({ message: "Target language is required" });
  }

  const normalizedTargetLanguage = String(targetLanguage).toLowerCase();
  const supportedLanguages = [
    "en",
    "ta",
    "hi",
    "te",
    "kn",
    "ml",
    "fr",
    "es",
    "ar",
    "ja",
    "de",
  ];

  if (!supportedLanguages.includes(normalizedTargetLanguage)) {
    return res
      .status(400)
      .json({ message: "Unsupported target language for translation" });
  }

  try {
    const commentData = await comment.findById(_id);
    if (!commentData) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if translation already exists
    const existingTranslation = commentData.translations.find(
      (t) => t.language === normalizedTargetLanguage
    );
    if (existingTranslation) {
      return res.status(200).json({
        language: normalizedTargetLanguage,
        text: existingTranslation.text,
      });
    }

    // Translate comment
    const translatedText = await translateText(
      commentData.commentbody,
      normalizedTargetLanguage
    );

    // Save translation to database
    commentData.translations.push({
      language: targetLanguage,
      text: translatedText,
    });
    await commentData.save();

    res.status(200).json({
      language: normalizedTargetLanguage,
      text: translatedText,
      translatedText,
    });
  } catch (error) {
    console.error("Error translating comment:", error);
    return res.status(500).json({ message: "Translation failed" });
  }
};

