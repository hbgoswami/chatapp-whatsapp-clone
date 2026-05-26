require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");

connectDB();

const app = express();
const server = http.createServer(app);
const allowedOrigins = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL, "http://localhost:3000"] : ["http://localhost:3000"];
const io = new Server(server, { cors: { origin: allowedOrigins, credentials: true } });

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/chats", require("./routes/chatRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));

const onlineUsers = {};

io.on("connection", (socket) => {
  socket.on("setup", (userId) => {
    socket.join(userId);
    onlineUsers[userId] = socket.id;
    io.emit("online-users", Object.keys(onlineUsers));
  });

  socket.on("join-chat", (chatId) => socket.join(chatId));

  socket.on("send-message", (message) => {
    message.chat.members.forEach((member) => {
      if (member._id !== message.sender._id) {
        io.to(member._id).emit("receive-message", message);
      }
    });
  });

  socket.on("typing", ({ chatId, userId }) => socket.to(chatId).emit("typing", userId));
  socket.on("stop-typing", (chatId) => socket.to(chatId).emit("stop-typing"));

  socket.on("disconnect", () => {
    const userId = Object.keys(onlineUsers).find((k) => onlineUsers[k] === socket.id);
    if (userId) {
      delete onlineUsers[userId];
      io.emit("online-users", Object.keys(onlineUsers));
    }
  });
});

server.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
