import { useEffect, useState, useRef } from "react";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { FiSend, FiPaperclip, FiSmile, FiInfo } from "react-icons/fi";
import EmojiPicker from "emoji-picker-react";
import ChatInfoPanel from "./ChatInfoPanel";

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
  const bottomRef = useRef();
  const typingTimeout = useRef();

  const otherUser = !chat.isGroup && chat.members.find((m) => m._id !== user._id);
  const isOtherOnline = otherUser && onlineUsers.includes(otherUser._id);
  const chatName = chat.isGroup ? chat.groupName : otherUser?.name;
  const chatAvatar = chat.isGroup ? chat.groupAvatar : otherUser?.avatar;

  useEffect(() => {
    if (!chat) return;
    API.get(`/messages/${chat._id}`).then(({ data }) => setMessages(data));
    socket?.emit("join-chat", chat._id);
    setText("");
    setFile(null);
    setFilePreview(null);
  }, [chat, socket]);

  useEffect(() => {
    if (!socket) return;
    const onReceive = (msg) => {
      if (msg.chat._id === chat._id) setMessages((prev) => [...prev, msg]);
    };
    socket.on("receive-message", onReceive);
    socket.on("typing", () => setTyping(true));
    socket.on("stop-typing", () => setTyping(false));
    return () => {
      socket.off("receive-message", onReceive);
      socket.off("typing");
      socket.off("stop-typing");
    };
  }, [socket, chat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
  };

  const sendMessage = async () => {
    if (!text.trim() && !file) return;
    const formData = new FormData();
    formData.append("chatId", chat._id);
    if (text) formData.append("content", text);
    if (file) formData.append("media", file);
    const { data } = await API.post("/messages", formData);
    setMessages((prev) => [...prev, data]);
    socket?.emit("send-message", { ...data, chat });
    setText("");
    setFile(null);
    setFilePreview(null);
  };

  const grouped = groupByDate(messages);

  return (
    <div className="chat-area">
      <div className="chat-window">
        {/* Header */}
        <div className="chat-header" onClick={() => setShowInfo((s) => !s)} style={{ cursor: "pointer" }}>
          <div className="avatar-wrapper">
            {chatAvatar
              ? <img src={chatAvatar} alt="avatar" className="avatar" />
              : <div className="avatar-placeholder">{chatName?.[0]}</div>}
            {isOtherOnline && <span className="online-dot" />}
          </div>
          <div style={{ flex: 1 }}>
            <p className="chat-name">{chatName}</p>
            <p className="chat-status">
              {typing ? "typing..." : chat.isGroup
                ? `${chat.members.length} members`
                : isOtherOnline ? "online" : "offline"}
            </p>
          </div>
          <button className="icon-btn" title="Info" onClick={(e) => { e.stopPropagation(); setShowInfo((s) => !s); }}>
            <FiInfo />
          </button>
        </div>

        {/* Messages */}
        <div className="messages">
          {grouped.map((item, i) =>
            item.type === "separator" ? (
              <div key={i} className="date-separator"><span>{item.label}</span></div>
            ) : (
              <div key={item.data._id} className={`message ${item.data.sender._id === user._id ? "sent" : "received"}`}>
                {chat.isGroup && item.data.sender._id !== user._id && (
                  <span className="sender-name">{item.data.sender.name}</span>
                )}
                {item.data.mediaUrl && item.data.mediaType === "image" && (
                  <img src={item.data.mediaUrl} alt="media" className="media-img" />
                )}
                {item.data.mediaUrl && item.data.mediaType === "file" && (
                  <a href={item.data.mediaUrl} target="_blank" rel="noreferrer" className="file-link">📎 Download File</a>
                )}
                {item.data.content && <p>{item.data.content}</p>}
                <div className="msg-meta">
                  <span className="msg-time">
                    {new Date(item.data.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {item.data.sender._id === user._id && (
                    <span className={`read-receipt ${item.data.readBy.length > 1 ? "read" : ""}`}>
                      {item.data.readBy.length > 1 ? "✓✓" : "✓"}
                    </span>
                  )}
                </div>
              </div>
            )
          )}
          <div ref={bottomRef} />
        </div>

        {/* Emoji Picker */}
        {showEmoji && (
          <div className="emoji-picker">
            <EmojiPicker
              theme="dark"
              onEmojiClick={(e) => { setText((t) => t + e.emoji); setShowEmoji(false); }}
            />
          </div>
        )}

        {/* File Preview */}
        {file && (
          <div className="file-preview-bar">
            {filePreview
              ? <img src={filePreview} alt="preview" className="file-preview-img" />
              : <span className="file-link">📎 {file.name}</span>}
            <button className="icon-btn" onClick={() => { setFile(null); setFilePreview(null); }}>✕</button>
          </div>
        )}

        {/* Input */}
        <div className="message-input">
          <button className="icon-btn" onClick={() => setShowEmoji((s) => !s)}><FiSmile /></button>
          <label className="icon-btn">
            <FiPaperclip />
            <input type="file" hidden onChange={handleFileChange} />
          </label>
          <input
            placeholder="Type a message"
            value={text}
            onChange={handleTyping}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          />
          <button className="send-btn" onClick={sendMessage}><FiSend /></button>
        </div>
      </div>

      {/* Info Panel */}
      {showInfo && <ChatInfoPanel chat={chat} onClose={() => setShowInfo(false)} />}
    </div>
  );
}
