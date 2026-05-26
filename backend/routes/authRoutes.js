const router = require("express").Router();
const { register, login, getUsers, updateProfile } = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.get("/users", protect, getUsers);
router.put("/profile", protect, updateProfile);

module.exports = router;
