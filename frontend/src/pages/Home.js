import { useState } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";

export default function Home() {
  const [selectedChat, setSelectedChat] = useState(null);

  return (
    <div className="home">
      <Sidebar onSelectChat={setSelectedChat} selectedChat={selectedChat} />
      {selectedChat ? (
        <ChatWindow chat={selectedChat} key={selectedChat._id} />
      ) : (
        <div className="no-chat">
          <div className="no-chat-inner">
            <div className="no-chat-icon">💬</div>
            <h2>WhatsApp Clone</h2>
            <p>Send and receive messages without keeping your phone online.</p>
            <p style={{ fontSize: 12, marginTop: 8, color: "#667781" }}>
              End-to-end encrypted
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
