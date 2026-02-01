const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { readData, writeData } = require('../utils/data');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'workforce-planner-secret-key-change-in-production';
const TOKEN_EXPIRY = '24h';

// Initialize default admin user if no users exist
const initializeDefaultAdmin = () => {
  const users = readData('users') || [];
  if (users.length === 0) {
    const adminUser = {
      id: uuidv4(),
      email: 'admin@company.com',
      passwordHash: bcrypt.hashSync('admin123', 12),
      employeeId: null,
      role: 'admin',
      name: 'System Admin',
      createdAt: new Date().toISOString()
    };
    writeData('users', [adminUser]);
    console.log('✅ Default admin user created: admin@company.com / admin123');
  }
};

// Run on module load
initializeDefaultAdmin();

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = readData('users') || [];
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = bcrypt.compareSync(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Return user info (without password)
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
    const users = readData('users') || [];
    const user = users.find(u => u.id === req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { passwordHash, ...userWithoutPassword } = user;
    
    // Also get linked employee if exists
    let linkedEmployee = null;
    if (user.employeeId) {
      const employees = readData('employees') || [];
      linkedEmployee = employees.find(e => e.id === user.employeeId);
    }

    res.json({ 
      user: userWithoutPassword, 
      linkedEmployee 
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Register new user (admin only)
router.post('/register', authenticateToken, isAdmin, (req, res) => {
  try {
    const { email, password, name, role, employeeId } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const users = readData('users') || [];
    
    // Check if email already exists
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const newUser = {
      id: uuidv4(),
      email: email.toLowerCase(),
      passwordHash: bcrypt.hashSync(password, 12),
      name,
      role: role || 'viewer',
      employeeId: employeeId || null,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeData('users', users);

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
    const users = readData('users') || [];
    const usersWithoutPasswords = users.map(({ passwordHash, ...user }) => user);
    res.json(usersWithoutPasswords);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Update user (admin only)
router.put('/users/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, name, role, employeeId } = req.body;

    const users = readData('users') || [];
    const userIndex = users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check email uniqueness if changing
    if (email && email.toLowerCase() !== users[userIndex].email.toLowerCase()) {
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Update fields
    if (email) users[userIndex].email = email.toLowerCase();
    if (password) users[userIndex].passwordHash = bcrypt.hashSync(password, 12);
    if (name) users[userIndex].name = name;
    if (role) users[userIndex].role = role;
    if (employeeId !== undefined) users[userIndex].employeeId = employeeId;

    writeData('users', users);

    const { passwordHash, ...userWithoutPassword } = users[userIndex];
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
    const users = readData('users') || [];
    
    // Prevent deleting the last admin
    const user = users.find(u => u.id === id);
    if (user?.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }
    }

    const filteredUsers = users.filter(u => u.id !== id);
    writeData('users', filteredUsers);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
