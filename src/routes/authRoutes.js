'use strict';

const express = require('express');
const router = express.Router();
const { authController } = require('../controllers/authController');

router.get('/login', (req, res) => authController.renderLogin(req, res));
router.post('/login', (req, res) => authController.processLogin(req, res));
router.get('/register', (req, res) => authController.renderRegister(req, res));
router.post('/register', (req, res) => authController.processRegister(req, res));
router.get('/logout', (req, res) => authController.logout(req, res));
router.get('/status', (req, res) => authController.status(req, res));

module.exports = router;
