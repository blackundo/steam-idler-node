const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

// Áp dụng middleware xác thực cho tất cả routes
router.use(requireAuth);

router.get('/', userController.showHome);
router.get('/users', userController.showUsers);
router.post('/users', userController.createUser);
router.post('/users/:id', userController.deleteUser);
router.post('/users/:id/pause', userController.pauseUser);
router.post('/users/:id/resume', userController.resumeUser);
router.get('/users/:id/totp', userController.showTOTP);

module.exports = router; 