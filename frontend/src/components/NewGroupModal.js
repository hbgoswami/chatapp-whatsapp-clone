import { useState, useEffect } from "react";
import API from "../utils/api";
import { FiX, FiSearch } from "react-icons/fi";

export default function NewGroupModal({ onClose, onGroupCreated }) {
  const [step, setStep] = useState(1);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    API.get("/auth/users").then(({ data }) => setUsers(data));
  }, []);

  const filtered = users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()));

  const toggleUser = (u) => {
    setSelected((prev) =>
      prev.find((s) => s._id === u._id) ? prev.filter((s) => s._id !== u._id) : [...prev, u]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selected.length < 2) return;
    const { data } = await API.post("/chats/group", {
      name: groupName,
      members: selected.map((u) => u._id),
    });
    onGroupCreated(data);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <button className="icon-btn" onClick={onClose}><FiX /></button>
          <h3>{step === 1 ? "Add Participants" : "New Group"}</h3>
        </div>

        {step === 1 ? (
          <>
            {selected.length > 0 && (
              <div className="selected-chips">
                {selected.map((u) => (
                  <span key={u._id} className="chip">
                    {u.name}
                    <button onClick={() => toggleUser(u)}>×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="modal-search">
              <FiSearch />
              <input placeholder="Search contacts" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="modal-list">
              {filtered.map((u) => (
                <div key={u._id} className={`modal-item ${selected.find((s) => s._id === u._id) ? "selected" : ""}`} onClick={() => toggleUser(u)}>
                  {u.avatar ? <img src={u.avatar} alt="avatar" className="avatar" /> : <div className="avatar-placeholder">{u.name[0]}</div>}
                  <div>
                    <p className="chat-name">{u.name}</p>
                    <p className="chat-preview">{u.email}</p>
                  </div>
                  {selected.find((s) => s._id === u._id) && <span className="check">✓</span>}
                </div>
              ))}
            </div>
            {selected.length >= 2 && (
              <button className="modal-next-btn" onClick={() => setStep(2)}>Next →</button>
            )}
          </>
        ) : (
          <div className="panel-body">
            <div className="profile-avatar-section">
              <div className="profile-avatar-placeholder" style={{ width: 80, height: 80, fontSize: 32 }}>
                {groupName[0] || "G"}
              </div>
            </div>
            <div className="profile-field">
              <label>Group Name</label>
              <input placeholder="Enter group name" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            </div>
            <p style={{ color: "#8696a0", fontSize: 13, padding: "0 16px" }}>
              {selected.length} participants: {selected.map((u) => u.name).join(", ")}
            </p>
            <button className="save-btn" onClick={handleCreate} disabled={!groupName.trim()}>Create Group</button>
          </div>
        )}
      </div>
    </div>
  );
}
