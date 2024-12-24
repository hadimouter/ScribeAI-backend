const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
    createDocument,
    updateDocument,
    getDocuments,
    getDocument,
    deleteDocument,
    exportPDF,
    exportDOCX,
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

router.get('/:id/export/pdf', exportPDF); 
router.get('/:id/export/docx', exportDOCX); 




module.exports = router;
