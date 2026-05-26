import { useEffect, useState } from "react";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { FiSearch, FiLogOut, FiEdit, FiUsers, FiMessageSquare } from "react-icons/fi";
import ProfilePanel from "./ProfilePanel";
import NewGroupModal from "./NewGroupModal";
import NewChatModal from "./NewChatModal";

export default function Sidebar({ onSelectChat, selectedChat }) {
  const { user, logout } = useAuth();
  const { onlineUsers } = useSocket();
  const [chats, setChats] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("chats");
  const [showProfile, setShowProfile] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    API.get("/chats").then(({ data }) => setChats(data));
  }, []);

  const getChatName = (chat) =>
    chat.isGroup ? chat.groupName : chat.members.find((m) => m._id !== user._id)?.name || "Unknown";

  const getChatAvatar = (chat) =>
    chat.isGroup ? chat.groupAvatar || null : chat.members.find((m) => m._id !== user._id)?.avatar || null;

  const isOnline = (chat) => {
    if (chat.isGroup) return false;
    const other = chat.members.find((m) => m._id !== user._id);
    return onlineUsers.includes(other?._id);
  };

  const getLastMessageTime = (chat) => {
    if (!chat.updatedAt) return "";
    const date = new Date(chat.updatedAt);
    const now = new Date();
    if (date.toDateString() === now.toDateString())
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  const filteredChats = chats.filter((c) =>
    getChatName(c).toLowerCase().includes(search.toLowerCase())
  );

  const handleGroupCreated = (group) => {
    setChats((prev) => [group, ...prev]);
    onSelectChat(group);
  };

  const handleChatOpen = (chat) => {
    setChats((prev) => [chat, ...prev.filter((c) => c._id !== chat._id)]);
    onSelectChat(chat);
  };

  return (
    <>
      <div className="sidebar">
        {/* Header */}
        <div className="sidebar-header">
          <div className="user-info" onClick={() => setShowProfile(true)} style={{ cursor: "pointer" }}>
            {user.avatar
              ? <img src={user.avatar} alt="avatar" className="avatar" />
              : <div className="avatar-placeholder">{user.name[0]}</div>}
            <span>{user.name}</span>
          </div>
          <div className="header-actions">
            <button className="icon-btn" title="New Chat" onClick={() => setShowNewChat(true)}><FiEdit /></button>
            <button className="icon-btn" title="New Group" onClick={() => setShowNewGroup(true)}><FiUsers /></button>
            <div className="menu-wrapper">
              <button className="icon-btn" onClick={() => setShowMenu((s) => !s)}>⋮</button>
              {showMenu && (
                <div className="dropdown-menu">
                  <button onClick={() => { setShowProfile(true); setShowMenu(false); }}>Profile</button>
                  <button onClick={() => { setShowNewGroup(true); setShowMenu(false); }}>New Group</button>
                  <button onClick={logout}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="sidebar-tabs">
          <button className={`tab-btn ${activeTab === "chats" ? "active" : ""}`} onClick={() => setActiveTab("chats")}>
            <FiMessageSquare /> Chats
          </button>
          <button className={`tab-btn ${activeTab === "groups" ? "active" : ""}`} onClick={() => setActiveTab("groups")}>
            <FiUsers /> Groups
          </button>
        </div>

        {/* Search */}
        <div className="search-bar">
          <FiSearch />
          <input placeholder="Search chats" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && <button className="icon-btn" style={{ fontSize: 14 }} onClick={() => setSearch("")}>✕</button>}
        </div>

        {/* Chat List */}
        <div className="chat-list">
          {filteredChats
            .filter((c) => activeTab === "groups" ? c.isGroup : !c.isGroup)
            .map((chat) => (
              <div
                key={chat._id}
                className={`chat-item ${selectedChat?._id === chat._id ? "active" : ""}`}
                onClick={() => onSelectChat(chat)}
              >
                <div className="avatar-wrapper">
                  {getChatAvatar(chat)
                    ? <img src={getChatAvatar(chat)} alt="avatar" className="avatar" />
                    : <div className="avatar-placeholder">{getChatName(chat)[0]}</div>}
                  {isOnline(chat) && <span className="online-dot" />}
                </div>
                <div className="chat-info">
                  <div className="chat-info-top">
                    <span className="chat-name">{getChatName(chat)}</span>
                    <span className="chat-time">{getLastMessageTime(chat)}</span>
                  </div>
                  <span className="chat-preview">
                    {chat.isGroup && chat.lastMessage?.sender?.name
                      ? `${chat.lastMessage.sender.name}: `
                      : ""}
                    {chat.lastMessage?.content || (chat.lastMessage?.mediaUrl ? "📎 Media" : "No messages yet")}
                  </span>
                </div>
              </div>
            ))}
          {filteredChats.filter((c) => activeTab === "groups" ? c.isGroup : !c.isGroup).length === 0 && (
            <div className="empty-list">
              <p>{activeTab === "groups" ? "No groups yet" : "No chats yet"}</p>
              <p style={{ fontSize: 12 }}>
                {activeTab === "groups" ? "Click the group icon to create one" : "Click the edit icon to start a chat"}
              </p>
            </div>
          )}
        </div>
      </div>

      {showProfile && <ProfilePanel onClose={() => setShowProfile(false)} />}
      {showNewGroup && <NewGroupModal onClose={() => setShowNewGroup(false)} onGroupCreated={handleGroupCreated} />}
      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} onChatOpen={handleChatOpen} />}
    </>
  );
}
