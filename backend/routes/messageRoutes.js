const router = require("express").Router();
const { sendMessage, getMessages } = require("../controllers/messageController");
const protect = require("../middleware/authMiddleware");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

router.post("/", protect, upload.single("media"), sendMessage);
router.get("/:chatId", protect, getMessages);

module.exports = router;
