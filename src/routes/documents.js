const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
    createDocument,
    updateDocument,
    getDocuments,
    getDocument,
    deleteDocument,
    generateDocumentWithAI
} = require('../controllers/documents');

router.use(protect);  

router.route('/')
    .get(getDocuments)
    .post(createDocument);

router.route('/:id')
    .get(getDocument)
    .put(updateDocument)
    .delete(deleteDocument);

module.exports = router;
