
const jwt = require('jsonwebtoken');

// -------------------
// USER MIDDLEWARE
// -------------------
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log("🛡️ User Authorization Header:", authHeader);
  console.log("🛡️ Extracted Token:", token);

  if (!token) return res.status(403).json({ error: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    if (decoded.role !== 'user') return res.status(403).json({ error: 'Forbidden: Not a user' });

    req.user = { id: decoded.userId };
    console.log("👤 User ID attached to req.user:", req.user.id);
    next();
  });
};

// -------------------
// ADMIN MIDDLEWARE
// -------------------
exports.verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log("🛡️ Admin Authorization Header:", authHeader);
  console.log("🛡️ Extracted Token:", token);

  if (!token) return res.status(403).json({ error: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden: Not an admin' });

    req.admin = { id: decoded.adminId };
    console.log("👤 Admin ID attached to req.admin:", req.admin.id);
    next();
  });
};
