const express = require("express");
const router = express.Router();
const { verifyToken, verifyAdminToken } = require("../middleware/authMiddleware");

const {
  getUser,
  updateUser,
  deleteUser,
  getUserImage,
  PostProfileImage,
  deleteProfileImage,
  getAllUsers,
} = require("../controllers/userController");


// ADMIN ROUTES

router.get("/all", verifyAdminToken, getAllUsers);
// router.delete("/admin/:userId", verifyAdminToken, deleteUser);



// USER ROUTES (Protected)

router.get("/userdetails", verifyToken, getUser);
router.put("/updateUser", verifyToken, updateUser);

router.get("/user_image", verifyToken, getUserImage);
router.post("/upload-profile-image", verifyToken, PostProfileImage);
router.delete("/deleteProfileimage", verifyToken, deleteProfileImage);


module.exports = router;
