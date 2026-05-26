const Message = require("../models/Message");
const Chat = require("../models/Chat");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

exports.sendMessage = async (req, res) => {
  const { chatId, content, replyTo } = req.body;
  try {
    let mediaUrl = null, mediaType = null;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, { resource_type: "auto" });
      mediaUrl = result.secure_url;
      mediaType = req.file.mimetype.startsWith("image") ? "image"
        : req.file.mimetype.startsWith("video") ? "video" : "file";
      fs.unlink(req.file.path, () => {});
    }

    if (!content && !mediaUrl) return res.status(400).json({ message: "Message cannot be empty" });

    const message = await Message.create({
      chat: chatId,
      sender: req.user._id,
      content: content || null,
      mediaUrl,
      mediaType,
      readBy: [req.user._id],
      replyTo: replyTo || null,
    });

    await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id, updatedAt: new Date() });

    const populated = await Message.findById(message._id).populate([
      { path: "sender", select: "name avatar" },
      { path: "chat", populate: { path: "members", select: "name avatar" } },
      { path: "replyTo", populate: { path: "sender", select: "name" } },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      chat: req.params.chatId,
      deletedFor: { $ne: req.user._id },
    })
      .populate("sender", "name avatar")
      .populate("replyTo", "content sender mediaType")
      .populate("reactions.user", "name")
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

exports.deleteMessage = async (req, res) => {
  const { deleteFor } = req.body;
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (deleteFor === "everyone" && message.sender.toString() === req.user._id.toString()) {
      message.content = null;
      message.mediaUrl = null;
      message.mediaType = null;
      message.deletedFor = message.chat.members || [];
      await message.save();
      return res.json({ deleted: "everyone", messageId: message._id });
    }

    await Message.findByIdAndUpdate(req.params.id, { $push: { deletedFor: req.user._id } });
    res.json({ deleted: "me", messageId: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.reactToMessage = async (req, res) => {
  const { emoji } = req.body;
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });

    const existingIdx = message.reactions.findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (existingIdx !== -1) {
      if (message.reactions[existingIdx].emoji === emoji) {
        message.reactions.splice(existingIdx, 1);
      } else {
        message.reactions[existingIdx].emoji = emoji;
      }
    } else {
      message.reactions.push({ user: req.user._id, emoji });
    }

    await message.save();
    const updated = await Message.findById(req.params.id).populate("reactions.user", "name");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.starMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: "Message not found" });

    const isStarred = message.starred.includes(req.user._id);
    if (isStarred) {
      await Message.findByIdAndUpdate(req.params.id, { $pull: { starred: req.user._id } });
    } else {
      await Message.findByIdAndUpdate(req.params.id, { $push: { starred: req.user._id } });
    }
    res.json({ starred: !isStarred, messageId: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.searchMessages = async (req, res) => {
  const { query } = req.query;
  try {
    const messages = await Message.find({
      chat: req.params.chatId,
      content: { $regex: query, $options: "i" },
      deletedFor: { $ne: req.user._id },
    })
      .populate("sender", "name avatar")
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
