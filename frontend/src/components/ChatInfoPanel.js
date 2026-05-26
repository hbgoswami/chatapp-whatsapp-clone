import { useState, useEffect } from "react";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { FiX, FiUserPlus, FiUserMinus, FiEdit2, FiCheck } from "react-icons/fi";

export default function ChatInfoPanel({ chat, onClose, onChatUpdate }) {
  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const [groupChat, setGroupChat] = useState(chat);
  const [showAddModal, setShowAddModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [groupName, setGroupName] = useState(chat.groupName || "");

  const otherUser = !chat.isGroup && chat.members.find((m) => m._id !== user._id);
  const isOnline = otherUser && onlineUsers.includes(otherUser._id);
  const isAdmin = chat.isGroup && groupChat.groupAdmin === user._id ||
    (chat.isGroup && groupChat.groupAdmin?._id === user._id) ||
    (chat.isGroup && groupChat.groupAdmin?.toString() === user._id);

  useEffect(() => {
    if (showAddModal) {
      API.get("/auth/users").then(({ data }) => {
        const memberIds = groupChat.members.map((m) => m._id);
        setAllUsers(data.filter((u) => !memberIds.includes(u._id)));
      });
    }
  }, [showAddModal, groupChat.members]);

  const handleAddMember = async (userId) => {
    try {
      const { data } = await API.put(`/chats/${groupChat._id}/add`, { userId });
      setGroupChat(data);
      onChatUpdate && onChatUpdate(data);
      setShowAddModal(false);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add member");
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Remove this member from the group?")) return;
    try {
      const { data } = await API.put(`/chats/${groupChat._id}/remove`, { userId });
      setGroupChat(data);
      onChatUpdate && onChatUpdate(data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove member");
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Leave this group?")) return;
    try {
      await API.put(`/chats/${groupChat._id}/remove`, { userId: user._id });
      onClose();
      window.location.reload();
    } catch (err) {
      alert("Failed to leave group");
    }
  };

  const handleUpdateName = async () => {
    if (!groupName.trim()) return;
    try {
      const { data } = await API.put(`/chats/${groupChat._id}`, { groupName });
      setGroupChat(data);
      onChatUpdate && onChatUpdate(data);
      setEditingName(false);
    } catch (err) {
      alert("Failed to update group name");
    }
  };

  const filtered = allUsers.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="panel info-panel">
      <div className="panel-header">
        <button className="icon-btn" onClick={onClose}><FiX /></button>
        <h3>{chat.isGroup ? "Group Info" : "Contact Info"}</h3>
      </div>

      <div className="panel-body">
        {/* Avatar & Name */}
        <div className="profile-avatar-section">
          {(chat.isGroup ? groupChat.groupAvatar : otherUser?.avatar)
            ? <img src={chat.isGroup ? groupChat.groupAvatar : otherUser.avatar} alt="avatar" className="profile-avatar" />
            : <div className="profile-avatar-placeholder">{(chat.isGroup ? groupChat.groupName : otherUser?.name)?.[0]}</div>}

          {chat.isGroup ? (
            <div className="group-name-edit">
              {editingName ? (
                <div className="group-name-input-row">
                  <input value={groupName} onChange={(e) => setGroupName(e.target.value)} className="group-name-input" autoFocus />
                  <button className="icon-btn" onClick={handleUpdateName}><FiCheck /></button>
                  <button className="icon-btn" onClick={() => setEditingName(false)}><FiX /></button>
                </div>
              ) : (
                <div className="group-name-row">
                  <h2 style={{ color: "#e9edef" }}>{groupChat.groupName}</h2>
                  {isAdmin && <button className="icon-btn" onClick={() => setEditingName(true)}><FiEdit2 /></button>}
                </div>
              )}
              <p style={{ color: "#8696a0", fontSize: 13 }}>Group · {groupChat.members.length} members</p>
            </div>
          ) : (
            <>
              <h2 style={{ marginTop: 12, color: "#e9edef" }}>{otherUser?.name}</h2>
              <p style={{ color: isOnline ? "#00a884" : "#8696a0", fontSize: 13 }}>{isOnline ? "online" : "offline"}</p>
            </>
          )}
        </div>

        {/* Contact About */}
        {!chat.isGroup && (
          <div className="info-section">
            <p className="info-label">About</p>
            <p className="info-value">{otherUser?.status || "Hey there! I am using WhatsApp Clone"}</p>
          </div>
        )}

        {/* Group Members */}
        {chat.isGroup && (
          <div className="info-section">
            <div className="info-section-header">
              <p className="info-label">{groupChat.members.length} participants</p>
              {isAdmin && (
                <button className="add-member-btn" onClick={() => setShowAddModal(true)}>
                  <FiUserPlus /> Add Member
                </button>
              )}
            </div>

            <div className="members-list">
              {groupChat.members.map((m) => (
                <div key={m._id} className="modal-item">
                  {m.avatar
                    ? <img src={m.avatar} alt="avatar" className="avatar" />
                    : <div className="avatar-placeholder">{m.name[0]}</div>}
                  <div style={{ flex: 1 }}>
                    <p className="chat-name">{m._id === user._id ? "You" : m.name}</p>
                    <p className="chat-preview">
                      {(groupChat.groupAdmin === m._id || groupChat.groupAdmin?._id === m._id)
                        ? "Group Admin" : m.status || ""}
                    </p>
                  </div>
                  {onlineUsers.includes(m._id) && <span className="online-badge">online</span>}
                  {isAdmin && m._id !== user._id && (
                    <button className="icon-btn remove-btn" title="Remove" onClick={() => handleRemoveMember(m._id)}>
                      <FiUserMinus />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Leave Group */}
            <button className="leave-group-btn" onClick={handleLeaveGroup}>
              Leave Group
            </button>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><FiX /></button>
              <h3>Add Member</h3>
            </div>
            <div className="modal-search">
              <input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            </div>
            <div className="modal-list">
              {filtered.length === 0 && (
                <p style={{ padding: 20, color: "#8696a0", textAlign: "center" }}>No users found</p>
              )}
              {filtered.map((u) => (
                <div key={u._id} className="modal-item" onClick={() => handleAddMember(u._id)}>
                  {u.avatar
                    ? <img src={u.avatar} alt="avatar" className="avatar" />
                    : <div className="avatar-placeholder">{u.name[0]}</div>}
                  <div>
                    <p className="chat-name">{u.name}</p>
                    <p className="chat-preview">{u.status || u.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
