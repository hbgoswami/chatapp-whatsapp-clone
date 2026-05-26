import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!user) return;
    const s = io("http://localhost:5000");
    s.emit("setup", user._id);
    s.on("online-users", setOnlineUsers);
    setSocket(s);
    return () => s.disconnect();
  }, [user]);

  return <SocketContext.Provider value={{ socket, onlineUsers }}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
