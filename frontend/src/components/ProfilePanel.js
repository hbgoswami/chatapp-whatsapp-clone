import { useState } from "react";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { FiX, FiCamera } from "react-icons/fi";

export default function ProfilePanel({ onClose }) {
  const { user, login } = useAuth();
  const [name, setName] = useState(user.name);
  const [status, setStatus] = useState(user.status || "Hey there! I am using WhatsApp Clone");
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);
    const { data } = await API.put("/auth/profile", formData);
    login({ ...user, avatar: data.avatar });
    setUploading(false);
  };

  const handleSave = async () => {
    const { data } = await API.put("/auth/profile", { name, status });
    login({ ...user, name: data.name, status: data.status });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <button className="icon-btn" onClick={onClose}><FiX /></button>
        <h3>Profile</h3>
      </div>
      <div className="panel-body">
        <div className="profile-avatar-section">
          <div className="profile-avatar-wrapper">
            {user.avatar
              ? <img src={user.avatar} alt="avatar" className="profile-avatar" />
              : <div className="profile-avatar-placeholder">{user.name[0]}</div>}
            <label className="avatar-edit-btn">
              {uploading ? "..." : <FiCamera />}
              <input type="file" accept="image/*" hidden onChange={handleAvatarChange} />
            </label>
          </div>
        </div>
        <div className="profile-field">
          <label>Your Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="profile-field">
          <label>About</label>
          <input value={status} onChange={(e) => setStatus(e.target.value)} />
        </div>
        <div className="profile-field">
          <label>Email</label>
          <input value={user.email} disabled />
        </div>
        <button className="save-btn" onClick={handleSave}>{saved ? "Saved ✓" : "Save"}</button>
      </div>
    </div>
  );
}
