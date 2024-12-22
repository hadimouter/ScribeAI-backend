
// backend/src/routes/ai.js
const express = require('express');
const router = express.Router();
const { aiAssistant } = require('../controllers/ai');
const { protect } = require('../middlewares/auth');

router.post('/assist', protect, aiAssistant);

module.exports = router;