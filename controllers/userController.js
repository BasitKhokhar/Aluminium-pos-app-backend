const prisma = require("../prisma/client");
const bucketStorage = require('../utils/bucketStorage');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

// Upload profile image (user selects from gallery)
exports.PostProfileImage = [
  upload.single("image"),
  async (req, res) => {
    try {
      const user_id = req.user?.id;
      const file = req.file;
      console.log("User ID:", user_id);
      console.log("profile image slected from user in backend:", file);
      if (!file || !file.buffer) {
        return res.status(400).json({ message: "Image file is required" });
      }

      const userIdInt = Number(user_id);
      if (isNaN(userIdInt)) {
        return res.status(400).json({ message: "Invalid user_id provided" });
      }

      // 1️⃣ Upload buffer to bucket
      const imageUrl = await bucketStorage.uploadImageFromBuffer(
        file.buffer,
        file.mimetype,
        `profile-images/${userIdInt}_${Date.now()}.jpg`
      );

      // 2️⃣ Check if record exists
      const existingImage = await prisma.userimages.findUnique({
        where: { user_id: userIdInt },
      });

      let result;
      if (existingImage) {
        result = await prisma.userimages.update({
          where: { user_id: userIdInt },
          data: { image_url: imageUrl },
        });
      } else {
        result = await prisma.userimages.create({
          data: { user_id: userIdInt, image_url: imageUrl },
        });
      }

      return res.status(200).json({
        message: "✅ Profile image saved successfully",
        data: result,
      });
    } catch (error) {
      console.error("❌ Error in PostProfileImage:", error);
      return res.status(500).json({
        message: "Server error while saving profile image",
        error: error.message,
      });
    }
  },
];

//  Get Single User details (User + Admin)
exports.getUser = async (req, res) => {
  const userId = parseInt(req.user?.id);
  try {
    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      select: { user_id: true, name: true, email: true, phone: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};
exports.updateUser = [
  upload.single("image"),
  async (req, res) => {
    const userId = parseInt(req.user?.id);
    const { name, email, phone } = req.body;
    const file = req.file;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Fetch existing profile image so we can fall back to it if no new file is sent
      const existingImage = await prisma.userimages.findUnique({
        where: { user_id: userId },
      });

      let imageUrl = req.body.image || existingImage?.image_url || null;

      // Upload new profile image if provided
      if (file && file.buffer) {
        const filename = `${userId}_${Date.now()}_${file.originalname}`;
        imageUrl = await bucketStorage.uploadImageFromBuffer(
          file.buffer,
          file.mimetype,
          filename
        );

        // Upsert the image record in userimages table
        await prisma.userimages.upsert({
          where: { user_id: userId },
          update: { image_url: imageUrl },
          create: { user_id: userId, image_url: imageUrl },
        });
      }

      await prisma.users.update({
        where: { user_id: userId },
        data: { name, email, phone },
      });

      res.json({ message: "User updated successfully", imageUrl });
    } catch (err) {
      console.error("❌ Update user error:", err);
      res.status(500).json({ error: "Database error" });
    }
  },
];

// Get User's Profile Image
exports.getUserImage = async (req, res) => {
  const userId = parseInt(req.user?.id);
  try {
    const user = await prisma.userimages.findFirst({
      where: { user_id: userId },
      select: { image_url: true },
    });
    console.log("User Image:", user);
    if (!user) return res.status(404).json({ message: 'User Image not found' });
    res.status(200).json({ userImage: user.image_url });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user name' });
  }
};
//  Delete profile image (User or Admin)
exports.deleteProfileImage = async (req, res) => {
  try {
    const userId = Number(req.user?.id);

    await prisma.userimages.delete({
      where: { user_id: userId },
    });

    res.json({ success: true, message: "Profile image deleted" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting profile image" });
  }
};

// Get All Users (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const start = parseInt(req.query.start) || 0;
    const end = parseInt(req.query.end) || 10;

    // Ensure valid pagination params
    const take = end - start;
    if (take <= 0) {
      return res.status(400).json({ error: "Invalid pagination parameters: end must be greater than start" });
    }

    // Fetch users with pagination, excluding sensitive data
    const users = await prisma.users.findMany({
      where: { isDeleted: false },
      orderBy: { created_at: "desc" },
      skip: start,
      take: take,
      select: {
        user_id: true,
        name: true,
        email: true,
        phone: true,
        termsStatus: true,
        created_at: true,
        googleId: true,
        facebookId: true,
        expoPushToken: true,
        isDeleted: true,
        // Exclude password, refreshToken
      }
    });

    const totalCount = await prisma.users.count({
      where: { isDeleted: false }
    });

    res.status(200).json({
      users,
      hasMore: start + take < totalCount,
      total: totalCount,
      start,
      end
    });

  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

//  Delete user (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    await prisma.users.update({
      where: { user_id: userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        refreshToken: null,
      },
    });

    res.json({ success: true, message: "User soft-deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting user" });
  }
};
