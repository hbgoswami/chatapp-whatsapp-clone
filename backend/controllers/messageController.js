const Message = require("../models/Message");
const Chat = require("../models/Chat");
const cloudinary = require("../config/cloudinary");

exports.sendMessage = async (req, res) => {
  const { chatId, content } = req.body;
  try {
    let mediaUrl = null, mediaType = null;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, { resource_type: "auto" });
      mediaUrl = result.secure_url;
      mediaType = req.file.mimetype.startsWith("image") ? "image" : req.file.mimetype.startsWith("video") ? "video" : "file";
    }

    const message = await Message.create({
      chat: chatId, sender: req.user._id, content, mediaUrl, mediaType, readBy: [req.user._id],
    });

    await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id });

    const populated = await message.populate([
      { path: "sender", select: "name avatar" },
      { path: "chat" },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name avatar")
      .sort({ createdAt: 1 });

    await Message.updateMany(
      { chat: req.params.chatId, readBy: { $ne: req.user._id } },
      { $push: { readBy: req.user._id } }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
