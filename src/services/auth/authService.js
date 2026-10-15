'use strict';

const crypto = require('crypto');
const { localStorageEngine } = require('../storage/localStorageEngine');
const config = require('../../../config/app');

const ROLES = {
  ADMIN: 'Administrator',
  EDITOR: 'Knowledge Editor',
  REVIEWER: 'Knowledge Reviewer',
  USER: 'Regular User',
  GUEST: 'Guest'
};

const PERMISSIONS = {
  [ROLES.ADMIN]: [
    'chat', 'manage_memory', 'submit_feedback', 'submit_candidate',
    'edit_knowledge', 'review_candidates', 'manage_admin', 'manage_system'
  ],
  [ROLES.EDITOR]: [
    'chat', 'manage_memory', 'submit_feedback', 'submit_candidate',
    'edit_knowledge'
  ],
  [ROLES.REVIEWER]: [
    'chat', 'manage_memory', 'submit_feedback', 'submit_candidate',
    'review_candidates'
  ],
  [ROLES.USER]: [
    'chat', 'manage_memory', 'submit_feedback', 'submit_candidate'
  ],
  [ROLES.GUEST]: [
    'chat'
  ]
};

class AuthService {
  constructor() {
    this.userCollection = 'users';
  }

  /**
   * Securely hash password using PBKDF2
   */
  hashPassword(password, salt = null) {
    const userSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, userSalt, 100000, 64, 'sha512').toString('hex');
    return { salt: userSalt, hash };
  }

  verifyPassword(password, salt, hash) {
    const testHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(hash, 'hex'));
  }

  /**
   * Register a new user
   */
  async registerUser({ username, email, password, role = ROLES.USER, adminToken = null }) {
    if (!username || !email || !password) {
      throw new Error('Username, email, and password are required');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = localStorageEngine.getAll(this.userCollection, u => u.email === normalizedEmail);
    if (existing.length > 0) {
      throw new Error('Email is already registered');
    }

    // Role escalation check: only allow ADMIN role if adminToken matches
    let assignedRole = ROLES.USER;
    if (role === ROLES.ADMIN) {
      if (adminToken && adminToken === config.security.adminSetupToken) {
        assignedRole = ROLES.ADMIN;
      } else {
        throw new Error('Invalid administrator setup token');
      }
    } else if ([ROLES.EDITOR, ROLES.REVIEWER].includes(role)) {
      if (adminToken && adminToken === config.security.adminSetupToken) {
        assignedRole = role;
      } else {
        assignedRole = ROLES.USER;
      }
    }

    const { salt, hash } = this.hashPassword(password);
    const uid = `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const userRecord = {
      id: uid,
      uid,
      username: username.trim(),
      email: normalizedEmail,
      role: assignedRole,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    localStorageEngine.set(this.userCollection, uid, userRecord);
    return this.sanitizeUser(userRecord);
  }

  /**
   * Authenticate user credentials
   */
  async loginUser({ email, password }) {
    if (!email || !password) throw new Error('Email and password are required');

    const normalizedEmail = email.toLowerCase().trim();
    const users = localStorageEngine.getAll(this.userCollection, u => u.email === normalizedEmail);
    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];
    const valid = this.verifyPassword(password, user.passwordSalt, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Create a guest session
   */
  createGuestUser() {
    const guestId = `guest_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      id: guestId,
      uid: guestId,
      username: 'Guest User',
      email: null,
      role: ROLES.GUEST,
      isGuest: true,
      createdAt: new Date().toISOString()
    };
  }

  getUserById(uid) {
    const user = localStorageEngine.get(this.userCollection, uid);
    return user ? this.sanitizeUser(user) : null;
  }

  getAllUsers() {
    return localStorageEngine.getAll(this.userCollection).map(u => this.sanitizeUser(u));
  }

  updateUserRole(uid, newRole) {
    if (!Object.values(ROLES).includes(newRole)) {
      throw new Error(`Invalid role: ${newRole}`);
    }
    const user = localStorageEngine.get(this.userCollection, uid);
    if (!user) throw new Error('User not found');
    user.role = newRole;
    user.updatedAt = new Date().toISOString();
    localStorageEngine.set(this.userCollection, uid, user);
    return this.sanitizeUser(user);
  }

  hasPermission(role, permission) {
    const perms = PERMISSIONS[role] || [];
    return perms.includes(permission);
  }

  sanitizeUser(user) {
    if (!user) return null;
    const { passwordHash, passwordSalt, ...safe } = user;
    return safe;
  }
}

const authService = new AuthService();

module.exports = {
  AuthService,
  authService,
  ROLES,
  PERMISSIONS
};
