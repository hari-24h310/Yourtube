import { useState } from "react";
import axios from "axios";
import moment from "moment";

interface CommentProps {
  comment: {
    _id: string;
    userid: { _id: string; username: string; city?: string };
    commentbody: string;
    userCity?: string;
    likes: number;
    dislikes: number;
    status: string;
    translations?: { language: string; text: string }[];
    createdAt: string;
  };
  currentUserId: string;
  onDelete: (id: string) => void;
  onEdit: (id: string, body: string) => void;
}

const LANGUAGES = [
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "ru", label: "Russian" },
  { code: "pt", label: "Portuguese" },
  { code: "ja", label: "Japanese" },
  { code: "en", label: "English" },
];

export default function Comment({ comment, currentUserId, onDelete, onEdit }: CommentProps) {
  const [likes, setLikes] = useState(comment.likes || 0);
  const [dislikes, setDislikes] = useState(comment.dislikes || 0);
  const [status, setStatus] = useState(comment.status);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasDisliked, setHasDisliked] = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  const [targetLang, setTargetLang] = useState("es");
  const [translating, setTranslating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.commentbody);

  if (comment.status === "blocked") {
  return (
    <div style={{
      padding: "12px 16px",
      background: "#fef3cd",
      border: "1px solid #ffc107",
      borderRadius: "8px",
      fontSize: "13px",
      color: "#856404",
      marginBottom: "12px"
    }}>
      🚫 This comment was removed for violating community guidelines.
    </div>
  );
}

  const handleLike = async () => {
    if (hasLiked) return;
    try {
      await axios.post(`/comment/like/${comment._id}`);
      setLikes((l) => l + 1);
      setHasLiked(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDislike = async () => {
    if (hasDisliked) return;
    try {
      const res = await axios.post(`/comment/dislike/${comment._id}`);
      setDislikes((d) => d + 1);
      setHasDisliked(true);
      if (res.data.removed) {
        setStatus("blocked");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTranslate = async () => {
    setTranslating(true);
    try {
      const res = await axios.post(`/comment/translate/${comment._id}`, { targetLanguage: targetLang });
      setTranslatedText(res.data.translatedText);
    } catch (err) {
      console.error(err);
    } finally {
      setTranslating(false);
    }
  };

  const handleEditSave = async () => {
    try {
      await axios.post(`/comment/editcomment/${comment._id}`, { commentbody: editBody });
      onEdit(comment._id, editBody);
      setIsEditing(false);
    } catch (err: any) {
      alert(err.response?.data?.message || "Could not edit comment.");
    }
  };

  const city = comment.userCity || comment.userid?.city || "";

  return (
    <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
      {/* Avatar */}
      <div style={{
        width: "36px", height: "36px", borderRadius: "50%",
        background: "#e0e0e0", display: "flex", alignItems: "center",
        justifyContent: "center", fontWeight: 600, fontSize: "14px",
        color: "#555", flexShrink: 0
      }}>
        {comment.userid?.username?.[0]?.toUpperCase() || "?"}
      </div>

      <div style={{ flex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: "14px" }}>{comment.userid?.username}</span>
          {city && (
            <span style={{ fontSize: "12px", color: "#888" }}>📍 {city}</span>
          )}
          <span style={{ fontSize: "12px", color: "#aaa" }}>{moment(comment.createdAt).fromNow()}</span>
        </div>

        {/* Body */}
        {isEditing ? (
          <div style={{ marginBottom: "8px" }}>
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={3}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "14px", resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
              <button onClick={handleEditSave} style={{ padding: "5px 14px", borderRadius: "6px", background: "#065fd4", color: "#fff", border: "none", cursor: "pointer", fontSize: "13px" }}>Save</button>
              <button onClick={() => setIsEditing(false)} style={{ padding: "5px 14px", borderRadius: "6px", background: "#f0f0f0", border: "none", cursor: "pointer", fontSize: "13px" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: "14px", color: "#1a1a1a", lineHeight: 1.5, marginBottom: "8px" }}>
            {comment.commentbody}
          </p>
        )}

        {/* Translated text */}
        {translatedText && (
          <div style={{
            background: "#e8f0fe", border: "1px solid #c5d8f7",
            borderRadius: "8px", padding: "10px 14px", marginBottom: "10px",
            fontSize: "13px", color: "#1a56db"
          }}>
            <strong style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {LANGUAGES.find(l => l.code === targetLang)?.label}:
            </strong>
            <p style={{ margin: "4px 0 0", lineHeight: 1.5 }}>{translatedText}</p>
          </div>
        )}

        {/* Actions row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Like */}
          <button
            onClick={handleLike}
            disabled={hasLiked}
            style={{
              background: "none", border: "none", cursor: hasLiked ? "default" : "pointer",
              display: "flex", alignItems: "center", gap: "4px",
              fontSize: "13px", color: hasLiked ? "#065fd4" : "#666",
              padding: "4px 0", fontWeight: hasLiked ? 600 : 400
            }}
          >
            👍 {likes}
          </button>

          {/* Dislike */}
          <button
            onClick={handleDislike}
            disabled={hasDisliked}
            style={{
              background: "none", border: "none", cursor: hasDisliked ? "default" : "pointer",
              display: "flex", alignItems: "center", gap: "4px",
              fontSize: "13px", color: hasDisliked ? "#d93025" : "#666",
              padding: "4px 0", fontWeight: hasDisliked ? 600 : 400
            }}
          >
            👎 {dislikes}
          </button>

          {/* Translate */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              style={{ fontSize: "12px", padding: "3px 6px", borderRadius: "6px", border: "1px solid #ccc" }}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <button
              onClick={handleTranslate}
              disabled={translating}
              style={{
                fontSize: "12px", padding: "3px 10px", borderRadius: "6px",
                border: "1px solid #ccc", background: "#f8f8f8", cursor: "pointer"
              }}
            >
              {translating ? "..." : "Translate"}
            </button>
          </div>

          {/* Owner actions */}
          {currentUserId === comment.userid?._id && (
            <>
              <button onClick={() => setIsEditing(true)} style={{ fontSize: "12px", color: "#555", background: "none", border: "none", cursor: "pointer" }}>✏️ Edit</button>
              <button onClick={() => onDelete(comment._id)} style={{ fontSize: "12px", color: "#d93025", background: "none", border: "none", cursor: "pointer" }}>🗑 Delete</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
