const express = require('express');
const router = express.Router();
const { extractContent, upload } = require('../controllers/studyController');
const { protect } = require('../middlewares/auth');

router.post('/extract-content',
  protect,
  upload.single('file'),
  extractContent
);

module.exports = router;