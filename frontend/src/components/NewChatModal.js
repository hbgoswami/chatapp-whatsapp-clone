import { useState, useEffect } from "react";
import API from "../utils/api";
import { FiX, FiSearch } from "react-icons/fi";

export default function NewChatModal({ onClose, onChatOpen }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    API.get("/auth/users").then(({ data }) => setUsers(data));
  }, []);

  const filtered = users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()));

  const openChat = async (userId) => {
    const { data } = await API.post("/chats", { userId });
    onChatOpen(data);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <button className="icon-btn" onClick={onClose}><FiX /></button>
          <h3>New Chat</h3>
        </div>
        <div className="modal-search">
          <FiSearch />
          <input placeholder="Search contacts" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="modal-list">
          {filtered.map((u) => (
            <div key={u._id} className="modal-item" onClick={() => openChat(u._id)}>
              {u.avatar ? <img src={u.avatar} alt="avatar" className="avatar" /> : <div className="avatar-placeholder">{u.name[0]}</div>}
              <div>
                <p className="chat-name">{u.name}</p>
                <p className="chat-preview">{u.status || u.email}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
