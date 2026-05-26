const Chat = require("../models/Chat");

exports.accessChat = async (req, res) => {
  const { userId } = req.body;
  try {
    let chat = await Chat.findOne({
      isGroup: false,
      members: { $all: [req.user._id, userId] },
    }).populate("members", "-password").populate("lastMessage");

    if (!chat) {
      chat = await Chat.create({ members: [req.user._id, userId], isGroup: false });
      chat = await Chat.findById(chat._id).populate("members", "-password");
    }
    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getChats = async (req, res) => {
  try {
    const chats = await Chat.find({ members: req.user._id })
      .populate("members", "-password")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addToGroup = async (req, res) => {
  const { userId } = req.body;
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: "Group not found" });
    if (chat.groupAdmin.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Only admin can add members" });
    if (chat.members.includes(userId))
      return res.status(400).json({ message: "User already in group" });
    const updated = await Chat.findByIdAndUpdate(
      req.params.id,
      { $push: { members: userId } },
      { new: true }
    ).populate("members", "-password");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeFromGroup = async (req, res) => {
  const { userId } = req.body;
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: "Group not found" });
    const isAdmin = chat.groupAdmin.toString() === req.user._id.toString();
    const isSelf = userId === req.user._id.toString();
    if (!isAdmin && !isSelf)
      return res.status(403).json({ message: "Not authorized" });
    const updated = await Chat.findByIdAndUpdate(
      req.params.id,
      { $pull: { members: userId } },
      { new: true }
    ).populate("members", "-password");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateGroup = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: "Group not found" });
    if (chat.groupAdmin.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Only admin can update group" });
    const updated = await Chat.findByIdAndUpdate(
      req.params.id,
      { groupName: req.body.groupName },
      { new: true }
    ).populate("members", "-password");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
  const { name, members } = req.body;
  try {
    const group = await Chat.create({
      groupName: name,
      members: [...members, req.user._id],
      isGroup: true,
      groupAdmin: req.user._id,
    });
    const fullGroup = await Chat.findById(group._id).populate("members", "-password");
    res.status(201).json(fullGroup);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
