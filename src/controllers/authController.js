'use strict';

const { authService, ROLES } = require('../services/auth/authService');

class AuthController {
  renderLogin(req, res) {
    if (req.session.user && !req.session.user.isGuest) {
      return res.redirect('/');
    }
    res.render('auth/login', {
      title: 'Sign In — Not an AI',
      error: null
    });
  }

  async processLogin(req, res) {
    const { email, password } = req.body;
    try {
      const user = await authService.loginUser({ email, password });
      req.session.user = user;
      res.redirect('/');
    } catch (err) {
      res.render('auth/login', {
        title: 'Sign In — Not an AI',
        error: err.message
      });
    }
  }

  renderRegister(req, res) {
    if (req.session.user && !req.session.user.isGuest) {
      return res.redirect('/');
    }
    res.render('auth/register', {
      title: 'Create Account — Not an AI',
      error: null
    });
  }

  async processRegister(req, res) {
    const { username, email, password, role, adminToken } = req.body;
    try {
      const user = await authService.registerUser({
        username,
        email,
        password,
        role: role || ROLES.USER,
        adminToken
      });
      req.session.user = user;
      res.redirect('/');
    } catch (err) {
      res.render('auth/register', {
        title: 'Create Account — Not an AI',
        error: err.message
      });
    }
  }

  logout(req, res) {
    req.session.destroy(() => {
      res.redirect('/auth/login');
    });
  }

  status(req, res) {
    res.json({
      authenticated: !!(req.session.user && !req.session.user.isGuest),
      user: req.session.user
    });
  }
}

const authController = new AuthController();

module.exports = {
  AuthController,
  authController
};
