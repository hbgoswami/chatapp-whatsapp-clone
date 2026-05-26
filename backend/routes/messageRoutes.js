const router = require("express").Router();
const { sendMessage, getMessages, deleteMessage, reactToMessage, starMessage, searchMessages } = require("../controllers/messageController");
const protect = require("../middleware/authMiddleware");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

router.post("/", protect, upload.single("media"), sendMessage);
router.get("/:chatId", protect, getMessages);
router.get("/:chatId/search", protect, searchMessages);
router.delete("/:id", protect, deleteMessage);
router.post("/:id/react", protect, reactToMessage);
router.post("/:id/star", protect, starMessage);

module.exports = router;
