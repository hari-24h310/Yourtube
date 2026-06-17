import { useEffect, useState } from "react";
import axios from "axios";
import Comment from "./Comment";

interface CommentsProps {
  videoid: string;
  currentUser: { _id: string; username: string } | null;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "ru", label: "Russian" },
  { code: "pt", label: "Portuguese" },
  { code: "ja", label: "Japanese" },
];

// Characters allowed: letters, digits, spaces, . , ! ? ' " - – ; : ( ) [ ]
const ALLOWED_PATTERN = /^[a-zA-Z0-9\s.,!?'"–;:()\[\]\u0080-\uFFFF-]+$/;

export default function Comments({ videoid, currentUser }: CommentsProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [userCity, setUserCity] = useState("Unknown");
  const [userLanguage, setUserLanguage] = useState("en");
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);

  // Detect city on mount
  useEffect(() => {
    const detectCity = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (data.city) setUserCity(data.city);
      } catch {
        setUserCity("Unknown");
      }
    };
    detectCity();
  }, []);

  // Load comments
  useEffect(() => {
    if (!videoid) return;
    axios
      .get(`/comment/${videoid}`)
      .then((res) => setComments(res.data))
      .catch(console.error);
  }, [videoid]);

  const handlePost = async () => {
    setError("");
    const trimmed = commentBody.trim();
    if (!trimmed) return setError("Comment cannot be empty.");
    if (trimmed.length > 5000) return setError("Comment is too long (max 5000 characters).");
    if (!ALLOWED_PATTERN.test(trimmed)) {
      return setError("Comment contains blocked characters. Only allowed: letters, numbers, spaces, . , ! ? ' \" - ( ) [ ]");
    }
    if (!currentUser) return setError("Please log in to comment.");

    setPosting(true);
    try {
      const res = await axios.post("/comment/postcomment", {
        userid: currentUser._id,
        videoid,
        commentbody: trimmed,
        userCity,
        userLanguage,
      });
      setComments((prev) => [res.data, ...prev]);
      setCommentBody("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to post comment.");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/comment/deletecomment/${id}`);
      setComments((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (id: string, newBody: string) => {
    setComments((prev) =>
      prev.map((c) => (c._id === id ? { ...c, commentbody: newBody } : c))
    );
  };

  return (
    <div style={{ maxWidth: "720px", padding: "24px 0" }}>
      <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "20px" }}>
        {comments.filter(c => c.status === "active").length} Comments
      </h3>

      {/* Posting box */}
      {currentUser && (
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "#065fd4", display: "flex", alignItems: "center",
              justifyContent: "center", color: "#fff", fontWeight: 600, flexShrink: 0
            }}>
              {currentUser.username?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>
                📍 {userCity} &nbsp;|&nbsp; Posting as: {currentUser.username}
              </div>
              <textarea
                value={commentBody}
                onChange={(e) => { setCommentBody(e.target.value); setError(""); }}
                placeholder="Add a comment..."
                rows={2}
                style={{
                  width: "100%", padding: "10px", borderRadius: "0",
                  border: "none", borderBottom: "2px solid #ccc",
                  fontSize: "14px", resize: "none", outline: "none",
                  background: "transparent", lineHeight: 1.5
                }}
                onFocus={(e) => { e.target.style.borderBottomColor = "#065fd4"; }}
                onBlur={(e) => { e.target.style.borderBottomColor = "#ccc"; }}
              />
            </div>
          </div>

          {error && (
            <div style={{
              fontSize: "12px", color: "#d93025", background: "#fce8e6",
              padding: "8px 12px", borderRadius: "6px", marginBottom: "8px"
            }}>
              ✗ {error}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "flex-end" }}>
            <select
              value={userLanguage}
              onChange={(e) => setUserLanguage(e.target.value)}
              style={{ fontSize: "12px", padding: "6px 10px", borderRadius: "20px", border: "1px solid #ccc" }}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <button
              onClick={() => setCommentBody("")}
              style={{ padding: "6px 14px", borderRadius: "20px", border: "none", background: "none", cursor: "pointer", fontSize: "13px" }}
            >
              Cancel
            </button>
            <button
              onClick={handlePost}
              disabled={posting || !commentBody.trim()}
              style={{
                padding: "6px 16px", borderRadius: "20px",
                background: commentBody.trim() ? "#065fd4" : "#e0e0e0",
                color: commentBody.trim() ? "#fff" : "#aaa",
                border: "none", cursor: commentBody.trim() ? "pointer" : "default",
                fontSize: "13px", fontWeight: 600
              }}
            >
              {posting ? "Posting..." : "Comment"}
            </button>
          </div>

          <div style={{ fontSize: "11px", color: "#aaa", marginTop: "6px" }}>
            ✓ Allowed: letters, numbers, spaces, . , ! ? ' " - ( ) [ ]
          </div>
        </div>
      )}

      {/* Comments list */}
      <div>
        {comments.map((comment) => (
          <Comment
            key={comment._id}
            comment={comment}
            currentUserId={currentUser?._id || ""}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        ))}
      </div>
    </div>
  );
}
