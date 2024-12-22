
// backend/src/routes/users.js
const express = require('express');
const router = express.Router();
const { getUserStats } = require('../controllers/users');
const { protect } = require('../middlewares/auth');
const { getCurrentSubscription } = require('../controllers/users');

router.get('/stats', protect, getUserStats);
// backend/src/routes/users.js
router.get('/subscription', protect, getCurrentSubscription);

module.exports = router;