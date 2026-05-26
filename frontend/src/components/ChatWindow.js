import { useEffect, useState, useRef } from "react";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { FiSend, FiPaperclip, FiSmile, FiInfo, FiSearch, FiX, FiStar, FiTrash2, FiCornerUpLeft, FiCopy } from "react-icons/fi";
import EmojiPicker from "emoji-picker-react";
import ChatInfoPanel from "./ChatInfoPanel";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const formatDateLabel = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { day: "2-digit", month: "long", year: "numeric" });
};

const groupByDate = (messages) => {
  const groups = [];
  let lastDate = null;
  messages.forEach((msg) => {
    const dateLabel = formatDateLabel(msg.createdAt);
    if (dateLabel !== lastDate) {
      groups.push({ type: "separator", label: dateLabel });
      lastDate = dateLabel;
    }
    groups.push({ type: "message", data: msg });
  });
  return groups;
};

export default function ChatWindow({ chat }) {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [typing, setTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showReactions, setShowReactions] = useState(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef();
  const typingTimeout = useRef();
  const fileInputRef = useRef();
  const messagesRef = useRef();

  const otherUser = !chat.isGroup && chat.members.find((m) => m._id !== user._id);
  const isOtherOnline = otherUser && onlineUsers.includes(otherUser._id);
  const chatName = chat.isGroup ? chat.groupName : otherUser?.name;
  const chatAvatar = chat.isGroup ? chat.groupAvatar : otherUser?.avatar;

  useEffect(() => {
    if (!chat) return;
    API.get(`/messages/${chat._id}`).then(({ data }) => setMessages(data));
    socket?.emit("join-chat", chat._id);
    setText(""); setFile(null); setFilePreview(null); setReplyTo(null);
  }, [chat, socket]);

  useEffect(() => {
    if (!socket) return;
    const onReceive = (msg) => {
      if (msg.chat._id === chat._id) setMessages((prev) => [...prev, msg]);
    };
    const onDeleted = ({ messageId }) => {
      setMessages((prev) => prev.map((m) =>
        m._id === messageId ? { ...m, content: null, mediaUrl: null, deletedForEveryone: true } : m
      ));
    };
    const onReacted = (updated) => {
      setMessages((prev) => prev.map((m) => m._id === updated._id ? updated : m));
    };
    socket.on("receive-message", onReceive);
    socket.on("message-deleted", onDeleted);
    socket.on("message-reacted", onReacted);
    socket.on("typing", () => setTyping(true));
    socket.on("stop-typing", () => setTyping(false));
    return () => {
      socket.off("receive-message", onReceive);
      socket.off("message-deleted", onDeleted);
      socket.off("message-reacted", onReacted);
      socket.off("typing");
      socket.off("stop-typing");
    };
  }, [socket, chat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close context menu on outside click
  useEffect(() => {
    const handler = () => { setContextMenu(null); setShowReactions(null); };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleTyping = (e) => {
    setText(e.target.value);
    socket?.emit("typing", { chatId: chat._id, userId: user._id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket?.emit("stop-typing", chat._id), 1500);
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) setFilePreview(URL.createObjectURL(f));
    else setFilePreview(null);
    e.target.value = "";
  };

  const sendMessage = async () => {
    if ((!text.trim() && !file) || sending) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("chatId", chat._id);
      if (text.trim()) formData.append("content", text.trim());
      if (file) formData.append("media", file);
      if (replyTo) formData.append("replyTo", replyTo._id);

      const { data } = await API.post("/messages", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessages((prev) => [...prev, data]);
      socket?.emit("send-message", { ...data, chat });
      setText(""); setFile(null); setFilePreview(null); setReplyTo(null);
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (msg, deleteFor) => {
    try {
      await API.delete(`/messages/${msg._id}`, { data: { deleteFor } });
      if (deleteFor === "everyone") {
        setMessages((prev) => prev.map((m) =>
          m._id === msg._id ? { ...m, content: null, mediaUrl: null, deletedForEveryone: true } : m
        ));
        socket?.emit("delete-message", {
          messageId: msg._id,
          chatId: chat._id,
          members: chat.members.map((m) => m._id),
        });
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== msg._id));
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
    setContextMenu(null);
  };

  const handleReact = async (msgId, emoji) => {
    try {
      const { data } = await API.post(`/messages/${msgId}/react`, { emoji });
      setMessages((prev) => prev.map((m) => m._id === msgId ? data : m));
      socket?.emit("react-message", { message: data, members: chat.members.map((m) => m._id) });
    } catch (err) {
      console.error("React failed:", err);
    }
    setShowReactions(null);
  };

  const handleStar = async (msgId) => {
    try {
      await API.post(`/messages/${msgId}/star`);
      setMessages((prev) => prev.map((m) => {
        if (m._id !== msgId) return m;
        const isStarred = m.starred?.includes(user._id);
        return { ...m, starred: isStarred ? m.starred.filter((s) => s !== user._id) : [...(m.starred || []), user._id] };
      }));
    } catch (err) {
      console.error("Star failed:", err);
    }
    setContextMenu(null);
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    setContextMenu(null);
  };

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.trim().length < 2) return setSearchResults([]);
    const { data } = await API.get(`/messages/${chat._id}/search?query=${q}`);
    setSearchResults(data);
  };

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("highlight"); setTimeout(() => el.classList.remove("highlight"), 1500); }
    setShowSearch(false); setSearchQuery(""); setSearchResults([]);
  };

  const onRightClick = (e, msg) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, msg });
    setShowReactions(null);
  };

  const grouped = groupByDate(messages);

  return (
    <div className="chat-area">
      <div className="chat-window">
        {/* Header */}
        <div className="chat-header">
          <div className="avatar-wrapper" onClick={() => setShowInfo((s) => !s)} style={{ cursor: "pointer" }}>
            {chatAvatar
              ? <img src={chatAvatar} alt="avatar" className="avatar" />
              : <div className="avatar-placeholder">{chatName?.[0]}</div>}
            {isOtherOnline && <span className="online-dot" />}
          </div>
          <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setShowInfo((s) => !s)}>
            <p className="chat-name">{chatName}</p>
            <p className="chat-status">
              {typing ? "typing..." : chat.isGroup ? `${chat.members.length} members` : isOtherOnline ? "online" : "offline"}
            </p>
          </div>
          <button className="icon-btn" onClick={() => { setShowSearch((s) => !s); setSearchQuery(""); setSearchResults([]); }}><FiSearch /></button>
          <button className="icon-btn" onClick={() => setShowInfo((s) => !s)}><FiInfo /></button>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="chat-search-bar">
            <FiSearch />
            <input placeholder="Search messages..." value={searchQuery} onChange={handleSearch} autoFocus />
            {searchQuery && <button className="icon-btn" onClick={() => { setSearchQuery(""); setSearchResults([]); }}><FiX /></button>}
            {searchResults.length > 0 && (
              <div className="search-results-dropdown">
                {searchResults.map((msg) => (
                  <div key={msg._id} className="search-result-item" onClick={() => scrollToMessage(msg._id)}>
                    <span className="search-result-sender">{msg.sender.name}</span>
                    <span className="search-result-text">{msg.content}</span>
                    <span className="search-result-time">{new Date(msg.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="messages" ref={messagesRef}>
          {grouped.map((item, i) =>
            item.type === "separator" ? (
              <div key={i} className="date-separator"><span>{item.label}</span></div>
            ) : (
              <div
                key={item.data._id}
                id={`msg-${item.data._id}`}
                className={`message ${item.data.sender._id === user._id ? "sent" : "received"}`}
                onContextMenu={(e) => onRightClick(e, item.data)}
              >
                {/* Group sender name */}
                {chat.isGroup && item.data.sender._id !== user._id && (
                  <span className="sender-name">{item.data.sender.name}</span>
                )}

                {/* Reply preview */}
                {item.data.replyTo && (
                  <div className="reply-preview">
                    <span className="reply-sender">{item.data.replyTo.sender?.name || "Unknown"}</span>
                    <span className="reply-text">{item.data.replyTo.content || "📎 Media"}</span>
                  </div>
                )}

                {/* Deleted message */}
                {item.data.deletedForEveryone || (!item.data.content && !item.data.mediaUrl && item.data._id) ? (
                  <p className="deleted-msg">🚫 This message was deleted</p>
                ) : (
                  <>
                    {item.data.mediaUrl && item.data.mediaType === "image" && (
                      <img src={item.data.mediaUrl} alt="media" className="media-img" onClick={() => window.open(item.data.mediaUrl, "_blank")} />
                    )}
                    {item.data.mediaUrl && item.data.mediaType === "video" && (
                      <video src={item.data.mediaUrl} controls className="media-img" />
                    )}
                    {item.data.mediaUrl && item.data.mediaType === "file" && (
                      <a href={item.data.mediaUrl} target="_blank" rel="noreferrer" className="file-link">📎 Download File</a>
                    )}
                    {item.data.content && <p>{item.data.content}</p>}
                  </>
                )}

                {/* Message meta */}
                <div className="msg-meta">
                  {item.data.starred?.includes(user._id) && <span className="star-icon">⭐</span>}
                  <span className="msg-time">
                    {new Date(item.data.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {item.data.sender._id === user._id && (
                    <span className={`read-receipt ${item.data.readBy?.length > 1 ? "read" : ""}`}>
                      {item.data.readBy?.length > 1 ? "✓✓" : "✓"}
                    </span>
                  )}
                </div>

                {/* Reactions display */}
                {item.data.reactions?.length > 0 && (
                  <div className="reactions-display">
                    {Object.entries(
                      item.data.reactions.reduce((acc, r) => {
                        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([emoji, count]) => (
                      <span key={emoji} className="reaction-badge" onClick={() => handleReact(item.data._id, emoji)}>
                        {emoji} {count > 1 ? count : ""}
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick reaction button on hover */}
                <button className="quick-react-btn" onClick={(e) => { e.stopPropagation(); setShowReactions(item.data._id); setContextMenu(null); }}>😊</button>

                {/* Reaction picker */}
                {showReactions === item.data._id && (
                  <div className="reaction-picker" onClick={(e) => e.stopPropagation()}>
                    {REACTIONS.map((emoji) => (
                      <button key={emoji} onClick={() => handleReact(item.data._id, emoji)}>{emoji}</button>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
          <div ref={bottomRef} />
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => { setReplyTo(contextMenu.msg); setContextMenu(null); }}><FiCornerUpLeft /> Reply</button>
            {contextMenu.msg.content && <button onClick={() => handleCopy(contextMenu.msg.content)}><FiCopy /> Copy</button>}
            <button onClick={() => handleStar(contextMenu.msg._id)}><FiStar /> {contextMenu.msg.starred?.includes(user._id) ? "Unstar" : "Star"}</button>
            <button onClick={() => handleDelete(contextMenu.msg, "me")}><FiTrash2 /> Delete for me</button>
            {contextMenu.msg.sender._id === user._id && (
              <button className="delete-everyone" onClick={() => handleDelete(contextMenu.msg, "everyone")}><FiTrash2 /> Delete for everyone</button>
            )}
          </div>
        )}

        {/* Emoji Picker */}
        {showEmoji && (
          <div className="emoji-picker" onClick={(e) => e.stopPropagation()}>
            <EmojiPicker theme="dark" onEmojiClick={(e) => { setText((t) => t + e.emoji); setShowEmoji(false); }} />
          </div>
        )}

        {/* Reply Bar */}
        {replyTo && (
          <div className="reply-bar">
            <div className="reply-bar-content">
              <span className="reply-bar-name">{replyTo.sender?.name || "You"}</span>
              <span className="reply-bar-text">{replyTo.content || "📎 Media"}</span>
            </div>
            <button className="icon-btn" onClick={() => setReplyTo(null)}><FiX /></button>
          </div>
        )}

        {/* File Preview */}
        {file && (
          <div className="file-preview-bar">
            {filePreview
              ? <img src={filePreview} alt="preview" className="file-preview-img" />
              : <span className="file-link">📎 {file.name}</span>}
            <button className="icon-btn" onClick={() => { setFile(null); setFilePreview(null); fileInputRef.current.value = ""; }}>✕</button>
          </div>
        )}

        {/* Input */}
        <div className="message-input">
          <button className="icon-btn" onClick={() => setShowEmoji((s) => !s)}><FiSmile /></button>
          <label className="icon-btn">
            <FiPaperclip />
            <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} />
          </label>
          <input
            placeholder="Type a message"
            value={text}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          />
          <button className="send-btn" onClick={sendMessage} disabled={sending}>
            {sending ? "..." : <FiSend />}
          </button>
        </div>
      </div>

      {showInfo && <ChatInfoPanel chat={chat} onClose={() => setShowInfo(false)} />}
    </div>
  );
}
