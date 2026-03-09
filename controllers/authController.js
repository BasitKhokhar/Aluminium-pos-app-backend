
require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');
const { OAuth2Client } = require('google-auth-library');
const fetch = require('node-fetch');
const jwtDecode = require('jwt-decode');


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// USER AUTH
const generateUserAccessToken = (user) =>
  jwt.sign({ userId: user.user_id, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });

const generateUserRefreshToken = (user) =>
  jwt.sign({ userId: user.user_id, role: 'user' }, process.env.REFRESH_SECRET, { expiresIn: '7d' });

// User Signup
exports.signup = async (req, res) => {
  try {
    const { name, email, password, phone, termsStatus } = req.body;

    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.isDeleted) {
        return res.status(403).json({ message: 'This email has already signed up and deleted, So signup with new email' });
      }
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.users.create({
      data: { name, email, password: hashed, phone, termsStatus },
    });

    res.json({
      message: 'User registered successfully',
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        termsStatus: user.termsStatus,
      },
    });
  } catch (err) {
    console.error('Signup Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// User Login
exports.login = async (req, res) => {
  const { email, password, termsStatus } = req.body;
  console.log("termsStatus", termsStatus)
  try {
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.isDeleted) {
      return res.status(403).json({ message: 'This email has already loged in and deleted, So first signup with new email' });
    }

    const accessToken = generateUserAccessToken(user);
    const refreshToken = generateUserRefreshToken(user);

    await prisma.users.update({
      where: { user_id: user.user_id },
      data: { refreshToken, termsStatus: true },
    });

    res.json({ accessToken, refreshToken, userId: user.user_id, email: user.email });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// User Refresh Token
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });

  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const user = await prisma.users.findUnique({ where: { user_id: payload.userId } });

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const newAccessToken = generateUserAccessToken(user);
    res.json({ accessToken: newAccessToken, refreshToken });
  } catch (err) {
    return res.status(403).json({ message: 'Refresh token expired or invalid' });
  }
};


// DELETE /user/delete
exports.deleteAccount = async (req, res) => {
  const userId = req.user.id;
  console.log("userId in delte controller", userId)
  try {
    await prisma.users.update({
      where: { user_id: userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        refreshToken: null,    // revoke existing tokens
      },
    });

    res.json({ message: 'Your account has been deleted successfully.' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ message: 'Server error while deleting account' });
  }
};


// Google Auth Controller
// exports.googleAuth = async (req, res) => {
//   const { idToken } = req.body;

//   if (!idToken) return res.status(400).json({ message: 'ID token is required' });

//   try {
//     // Verify ID token
//     const ticket = await client.verifyIdToken({
//       idToken,
//       audience: process.env.GOOGLE_CLIENT_ID,
//     });

//     const payload = ticket.getPayload();

//     // Optional: ensure email is verified
//     if (!payload.email_verified) {
//       return res.status(403).json({ message: 'Google email not verified' });
//     }

//     const { email, name, sub: googleId } = payload;

//     // Find user by email
//     let user = await prisma.users.findUnique({ where: { email } });

//     if (!user) {
//       // Create new user
//       user = await prisma.users.create({
//         data: {
//           name,
//           email,
//           password: null,
//           termsStatus: true,
//           googleId,
//         },
//       });
//     } else {
//       if (user.isDeleted) {
//         return res.status(403).json({ message: 'Account has been deleted' });
//       }

//       if (!user.googleId) {
//         // Update existing user to add googleId
//         user = await prisma.users.update({
//           where: { user_id: user.user_id },
//           data: { googleId },
//         });
//       }
//     }

//     // Generate tokens
//     const accessToken = generateUserAccessToken(user);
//     const refreshToken = generateUserRefreshToken(user);

//     // Save refresh token in DB
//     await prisma.users.update({
//       where: { user_id: user.user_id },
//       data: { refreshToken, termsStatus: true },
//     });

//     // Assign free trial if applicable
//     await handlePostLogin(user.user_id);

//     res.json({
//       accessToken,
//       refreshToken,
//       userId: user.user_id,
//       email: user.email,
//       name: user.name,
//     });

//   } catch (err) {
//     console.error('Google Auth Error:', err);
//     res.status(400).json({ message: 'Invalid Google token' });
//   }
// };


// POST /auth/logout
exports.logout = async (req, res) => {
  try {
    const userId = req.user.id; // Corrected to use req.user.id based on middleware

    await prisma.users.update({
      where: { user_id: userId },
      data: {
        refreshToken: null, // revoke session
      },
    });

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Logout failed" });
  }
};

// Update User Password
exports.updatePassword = async (req, res) => {
  const { previousPassword, newPassword } = req.body;
  console.log("previousPassword", previousPassword)
  console.log("newPassword", newPassword)
  const userId = req.user.id;

  if (!previousPassword || !newPassword) {
    return res.status(400).json({ message: 'Previous and new password are required' });
  }

  try {
    const user = await prisma.users.findUnique({ where: { user_id: userId } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify previous password
    const isMatch = await bcrypt.compare(previousPassword, user.password);
    if (!isMatch) {
      console.log("❌ Update password failed: Previous password does not match for user", userId);
      return res.status(400).json({ message: 'Incorrect previous password' });
    }
    console.log("isMatch", isMatch)
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password in DB
    await prisma.users.update({
      where: { user_id: userId },
      data: { password: hashedNewPassword },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update password error:', err.message);
    res.status(500).json({ message: 'Server error during password update' });
  }
};



// -------------------
// ADMIN AUTH
// -------------------
const generateAdminAccessToken = (admin) =>
  jwt.sign({ adminId: admin.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

const generateAdminRefreshToken = (admin) =>
  jwt.sign({ adminId: admin.id, role: 'admin' }, process.env.REFRESH_SECRET, { expiresIn: '7d' });

// Admin Signup (API only)
exports.adminSignup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if email exists
    const existingAdmin = await prisma.admin.findUnique({ where: { email } });
    if (existingAdmin) return res.status(400).json({ message: 'Admin already exists' });

    const hashed = await bcrypt.hash(password, 10);

    const admin = await prisma.admin.create({
      data: { name, email, password: hashed },
    });

    res.json({
      message: 'Admin created successfully',
      admin: { admin_id: admin.id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    console.error('Admin signup error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin Login
exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;
  console.log("email & password", email, password)
  try {
    const admin = await prisma.admin.findUnique({
      where: { email },
      include: { shops: true }
    });
    console.log("admin", admin)
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    console.log("admin", admin)
    const accessToken = generateAdminAccessToken(admin);
    const refreshToken = generateAdminRefreshToken(admin);

    await prisma.admin.update({
      where: { id: admin.id },
      data: { refreshToken },
    });
    console.log("accessToken", accessToken)
    console.log("refreshToken", refreshToken)
    res.json({ accessToken, refreshToken, adminId: admin.id, email: admin.email, name: admin.name, shops: admin.shops });
  } catch (err) {
    console.error('Admin login error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin Refresh Token
exports.adminRefresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'No token provided' });

  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const admin = await prisma.admin.findUnique({ where: { id: payload.adminId } });

    if (!admin || admin.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'Invalid token' });
    }

    const newAccessToken = generateAdminAccessToken(admin);
    res.json({ accessToken: newAccessToken, refreshToken });
  } catch (err) {
    return res.status(403).json({ message: 'Token expired or invalid' });
  }
};

// Update Admin Password
exports.updateAdminPassword = async (req, res) => {
  const { previousPassword, newPassword } = req.body;
  console.log("admin previousPassword", previousPassword)
  console.log("admin newPassword", newPassword)
  const adminId = req.admin.id;

  if (!previousPassword || !newPassword) {
    return res.status(400).json({ message: 'Previous and new password are required' });
  }

  try {
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Verify previous password
    const isMatch = await bcrypt.compare(previousPassword, admin.password);
    if (!isMatch) {
      console.log("❌ Update password failed: Previous password does not match for admin", adminId);
      return res.status(400).json({ message: 'Incorrect previous password' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password in DB
    await prisma.admin.update({
      where: { id: adminId },
      data: { password: hashedNewPassword },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update admin password error:', err.message);
    res.status(500).json({ message: 'Server error during admin password update' });
  }
};

