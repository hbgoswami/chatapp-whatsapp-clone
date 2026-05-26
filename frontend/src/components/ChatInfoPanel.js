import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { FiX } from "react-icons/fi";

export default function ChatInfoPanel({ chat, onClose }) {
  const { user } = useAuth();
  const { onlineUsers } = useSocket();

  const otherUser = !chat.isGroup && chat.members.find((m) => m._id !== user._id);
  const isOnline = otherUser && onlineUsers.includes(otherUser._id);

  return (
    <div className="panel info-panel">
      <div className="panel-header">
        <button className="icon-btn" onClick={onClose}><FiX /></button>
        <h3>{chat.isGroup ? "Group Info" : "Contact Info"}</h3>
      </div>
      <div className="panel-body">
        <div className="profile-avatar-section">
          {(chat.isGroup ? chat.groupAvatar : otherUser?.avatar)
            ? <img src={chat.isGroup ? chat.groupAvatar : otherUser.avatar} alt="avatar" className="profile-avatar" />
            : <div className="profile-avatar-placeholder">{(chat.isGroup ? chat.groupName : otherUser?.name)?.[0]}</div>}
          <h2 style={{ marginTop: 12, color: "#e9edef" }}>{chat.isGroup ? chat.groupName : otherUser?.name}</h2>
          {!chat.isGroup && (
            <p style={{ color: isOnline ? "#00a884" : "#8696a0", fontSize: 13 }}>{isOnline ? "online" : "offline"}</p>
          )}
        </div>

        {!chat.isGroup && (
          <div className="info-section">
            <p className="info-label">About</p>
            <p className="info-value">{otherUser?.status || "Hey there! I am using WhatsApp Clone"}</p>
          </div>
        )}

        {chat.isGroup && (
          <div className="info-section">
            <p className="info-label">{chat.members.length} participants</p>
            <div className="members-list">
              {chat.members.map((m) => (
                <div key={m._id} className="modal-item">
                  {m.avatar ? <img src={m.avatar} alt="avatar" className="avatar" /> : <div className="avatar-placeholder">{m.name[0]}</div>}
                  <div>
                    <p className="chat-name">{m._id === user._id ? "You" : m.name}</p>
                    <p className="chat-preview">{m._id === chat.groupAdmin ? "Group Admin" : ""}</p>
                  </div>
                  {onlineUsers.includes(m._id) && <span className="online-badge">online</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
