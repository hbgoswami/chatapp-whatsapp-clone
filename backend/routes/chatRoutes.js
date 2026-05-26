const router = require("express").Router();
const { accessChat, getChats, createGroupChat } = require("../controllers/chatController");
const protect = require("../middleware/authMiddleware");

router.post("/", protect, accessChat);
router.get("/", protect, getChats);
router.post("/group", protect, createGroupChat);

module.exports = router;
