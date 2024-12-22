// backend/src/routes/folders.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
    createFolder,
    getFolderStructure,
    moveItem,
    renameFolder,
    deleteFolder
} = require('../controllers/folders');

router.use(protect);

router.post('/', createFolder);
router.get('/structure', getFolderStructure);
router.post('/move', moveItem);
router.put('/:id', renameFolder);
router.delete('/:id', deleteFolder);

module.exports = router;