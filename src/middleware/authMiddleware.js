'use strict';

const crypto = require('crypto');
const { authService, ROLES } = require('../services/auth/authService');

/**
 * Ensures a session user exists; creates a Guest user if none
 */
function sessionAuth(req, res, next) {
  if (!req.session) {
    return next();
  }

  if (!req.session.user) {
    req.session.user = authService.createGuestUser();
  }

  // Ensure CSRF token exists
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }

  // Make user and csrf token available to EJS views
  res.locals.currentUser = req.session.user;
  res.locals.csrfToken = req.session.csrfToken;
  res.locals.isGuest = req.session.user.role === ROLES.GUEST;
  res.locals.isAdmin = req.session.user.role === ROLES.ADMIN;
  res.locals.isEditor = req.session.user.role === ROLES.EDITOR;
  res.locals.isReviewer = req.session.user.role === ROLES.REVIEWER;

  next();
}

/**
 * Protect routes by requiring specific permission
 */
function requirePermission(permission) {
  return (req, res, next) => {
    const user = req.session ? req.session.user : null;
    if (!user) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      return res.redirect('/auth/login');
    }

    if (!authService.hasPermission(user.role, permission)) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(403).json({ error: `Forbidden: requires permission ${permission}` });
      }
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: `You do not have permission (${permission}) to access this resource.`
      });
    }

    next();
  };
}

/**
 * Require admin role
 */
function requireAdmin(req, res, next) {
  return requirePermission('manage_admin')(req, res, next);
}

/**
 * Validate CSRF token on mutating requests
 */
function verifyCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Check header or body
  const clientToken = req.headers['x-csrf-token'] || (req.body && req.body._csrf);
  const sessionToken = req.session ? req.session.csrfToken : null;

  if (!clientToken || !sessionToken || clientToken !== sessionToken) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(403).json({ error: 'Invalid or missing CSRF token' });
    }
    return res.status(403).render('error', {
      title: 'CSRF Validation Failed',
      message: 'Your session security token could not be verified. Please refresh and try again.'
    });
  }

  next();
}

module.exports = {
  sessionAuth,
  requirePermission,
  requireAdmin,
  verifyCsrf
};
