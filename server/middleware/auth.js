const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'workforce-planner-secret-key-change-in-production';

// Verify JWT token middleware
const authenticateToken = (req, res, next) => {
  // Check for token in cookie first, then Authorization header
  const tokenFromCookie = req.cookies?.token;
  const authHeader = req.headers['authorization'];
  const tokenFromHeader = authHeader && authHeader.split(' ')[1];
  
  const token = tokenFromCookie || tokenFromHeader;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Check if user is manager or admin
const isManagerOrAdmin = (req, res, next) => {
  if (!['admin', 'manager'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Manager or admin access required' });
  }
  next();
};

module.exports = {
  authenticateToken,
  isAdmin,
  isManagerOrAdmin
};
