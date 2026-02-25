const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'workforce-planner-secret-key-change-in-production';
const TOKEN_EXPIRY = '24h';

// Initialize default admin user if no users exist
const initializeDefaultAdmin = () => {
  const users = db.getUsers();
  if (users.length === 0) {
    db.createUser({
      id: uuidv4(),
      username: 'admin',
      passwordHash: bcrypt.hashSync('admin123', 12),
      employeeId: null,
      role: 'admin',
      name: 'System Admin',
      createdAt: new Date().toISOString()
    });
    console.log('✅ Default admin user created: admin / admin123');
  }
};

initializeDefaultAdmin();

// Login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = db.getUserByUsername(username);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    const { passwordHash, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.getUserById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { passwordHash, ...userWithoutPassword } = user;
    let linkedEmployee = null;
    if (user.employeeId) {
      linkedEmployee = db.getEmployeeById(user.employeeId);
    }
    res.json({ user: userWithoutPassword, linkedEmployee });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Register new user (admin only)
router.post('/register', authenticateToken, isAdmin, (req, res) => {
  try {
    const { username, password, name, role, employeeId } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Username, password, and name are required' });
    }

    if (db.getUserByUsername(username)) {
      return res.status(400).json({ error: 'Username already registered' });
    }

    const newUser = {
      id: uuidv4(),
      username: username.toLowerCase(),
      passwordHash: bcrypt.hashSync(password, 12),
      name,
      role: role || 'viewer',
      employeeId: employeeId || null,
      createdAt: new Date().toISOString()
    };

    db.createUser(newUser);
    const { passwordHash, ...userWithoutPassword } = newUser;
    res.status(201).json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Get all users (admin only)
router.get('/users', authenticateToken, isAdmin, (req, res) => {
  try {
    const users = db.getUsers().map(({ passwordHash, ...u }) => u);
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Update user (admin only)
router.put('/users/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, name, role, employeeId } = req.body;

    const existing = db.getUserById(id);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    if (username && username.toLowerCase() !== existing.username.toLowerCase()) {
      if (db.getUserByUsername(username)) {
        return res.status(400).json({ error: 'Username already in use' });
      }
    }

    const updates = {};
    if (username) updates.username = username.toLowerCase();
    if (password) updates.passwordHash = bcrypt.hashSync(password, 12);
    if (name) updates.name = name;
    if (role) updates.role = role;
    if (employeeId !== undefined) updates.employeeId = employeeId;

    const updated = db.updateUser(id, updates);
    const { passwordHash, ...userWithoutPassword } = updated;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const user = db.getUserById(id);
    if (user?.role === 'admin' && db.countAdmins() <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last admin user' });
    }
    db.deleteUser(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
