const jwt = require('jsonwebtoken');

// -------------------
// ADMIN MIDDLEWARE (shop owner / tenant)
// -------------------
exports.verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(403).json({ error: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden: Not an admin' });

    req.admin = { id: decoded.adminId };
    next();
  });
};

// -------------------
// SUPERADMIN MIDDLEWARE (platform owner)
// -------------------
exports.verifySuperAdminToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(403).json({ error: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    if (decoded.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden: Not a superadmin' });

    req.superAdmin = { id: decoded.superAdminId };
    next();
  });
};
