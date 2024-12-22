// backend/src/routes/share.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const ShareLink = require('../models/ShareLink');
const User = require('../models/User');
const {
    generateShareLink,
    getSharedDocument,
    listShareLinks,
    revokeShareLink,
    updateSharedDocument
} = require('../controllers/share');
const { aiAssistant } = require('../controllers/ai');

// Routes protégées nécessitant une authentification
router.get('/links/:documentId', protect, listShareLinks);
router.post('/generate/:documentId', protect, generateShareLink);
router.delete('/revoke/:linkId', protect, revokeShareLink);

// Routes pour les documents partagés
router.put('/:token', updateSharedDocument);
router.get('/:token', getSharedDocument);

// Route IA pour les documents partagés
router.post('/:token/ai/assist', async (req, res, next) => {
    try {
        const shareLink = await ShareLink.findOne({
            token: req.params.token,
            permission: 'edit',
            expiresAt: { $gt: new Date() }
        });

        if (!shareLink) {
            return res.status(401).json({ 
                message: 'Lien invalide, expiré ou sans permission d\'édition' 
            });
        }

        // Attacher l'utilisateur qui a créé le document
        req.user = await User.findById(shareLink.createdBy);
        next();
    } catch (error) {
        res.status(500).json({ 
            message: 'Erreur lors de la vérification du lien de partage' 
        });
    }
}, aiAssistant);

module.exports = router;