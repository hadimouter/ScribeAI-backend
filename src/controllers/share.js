// backend/src/controllers/share.js
const ShareLink = require('../models/ShareLink');
const Document = require('../models/Document');
const crypto = require('crypto');

const generateShareLink = async (req, res) => {
    try {
        const { documentId } = req.params;
        const { permission = 'read', expiresIn = 7 } = req.body;

        const document = await Document.findOne({
            _id: documentId,
            user: req.user._id
        });

        if (!document) {
            return res.status(404).json({ message: 'Document non trouvé' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/shared/${token}`;

        const shareLink = await ShareLink.create({
            document: documentId,
            createdBy: req.user._id,
            token,
            permission,
            expiresAt: new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000),
            shareUrl
        });

        const linkWithUrl = {
            ...shareLink.toJSON(),
            shareLink: shareUrl
        };
        console.log(linkWithUrl)
        res.json(linkWithUrl);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSharedDocument = async (req, res) => {
    try {
        const { token } = req.params;

        const shareLink = await ShareLink.findOne({
            token,
            expiresAt: { $gt: new Date() }
        });

        if (!shareLink) {
            return res.status(404).json({ message: 'Lien de partage invalide ou expiré' });
        }

        // Mettre à jour les statistiques d'accès
        shareLink.lastAccessedAt = new Date();
        shareLink.accessCount += 1;
        await shareLink.save();

        const document = await Document.findById(shareLink.document)
            .select('title content');

        res.json({
            document,
            permission: shareLink.permission
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const listShareLinks = async (req, res) => {
    try {
        const { documentId } = req.params;

        const links = await ShareLink.find({
            document: documentId,
            createdBy: req.user._id,
            expiresAt: { $gt: new Date() }
        }).sort('-createdAt');

        // Transformer chaque lien pour inclure l'URL complète
        const linksWithUrls = links.map(link => ({
            ...link.toJSON(),
            shareLink: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/shared/${link.token}`
        }));

        res.json(linksWithUrls);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const revokeShareLink = async (req, res) => {
    try {
        const { linkId } = req.params;

        const link = await ShareLink.findOneAndDelete({
            _id: linkId,
            createdBy: req.user._id
        });

        if (!link) {
            return res.status(404).json({ message: 'Lien de partage non trouvé' });
        }

        res.json({ message: 'Lien de partage révoqué' });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const updateSharedDocument = async (req, res) => {
    try {
        const { token } = req.params;
        const { content, title } = req.body;

        const shareLink = await ShareLink.findOne({
            token,
            permission: 'edit',
            expiresAt: { $gt: new Date() }
        });

        if (!shareLink) {
            return res.status(404).json({ 
                message: 'Lien de partage invalide, expiré ou sans permission d\'édition' 
            });
        }

        const document = await Document.findByIdAndUpdate(
            shareLink.document,
            { 
                content,
                lastEditedAt: new Date() 
            },
            { new: true }
        );

        res.json({ document, permission: shareLink.permission });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


module.exports = {
    generateShareLink,
    getSharedDocument,
    listShareLinks,
    revokeShareLink,
    updateSharedDocument
};