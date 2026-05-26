const router = require("express").Router();
const { accessChat, getChats, createGroupChat, addToGroup, removeFromGroup, updateGroup } = require("../controllers/chatController");
const protect = require("../middleware/authMiddleware");

router.post("/", protect, accessChat);
router.get("/", protect, getChats);
router.post("/group", protect, createGroupChat);
router.put("/:id/add", protect, addToGroup);
router.put("/:id/remove", protect, removeFromGroup);
router.put("/:id", protect, updateGroup);

module.exports = router;
