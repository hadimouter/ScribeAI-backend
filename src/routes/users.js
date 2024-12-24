const express = require('express');
const router = express.Router();
const { getUserStats } = require('../controllers/users');
const { protect } = require('../middlewares/auth');
const { getCurrentSubscription, updateProfile, changePassword, deleteAccount} = require('../controllers/users');

router.get('/stats', protect, getUserStats);

router.get('/subscription', protect, getCurrentSubscription);

router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);


router.delete('/account', protect, deleteAccount);


module.exports = router;