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

exports.createGroupChat = async (req, res) => {
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
