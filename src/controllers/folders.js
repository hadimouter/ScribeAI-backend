const Folder = require('../models/Folder');
const Document = require('../models/Document');

// Créer un dossier
const createFolder = async (req, res) => {
    try {
        const { name, parentId } = req.body;

        // Si un parent est spécifié, vérifier qu'il appartient à l'utilisateur
        if (parentId) {
            const parentFolder = await Folder.findOne({
                _id: parentId,
                user: req.user._id
            });
            if (!parentFolder) {
                return res.status(404).json({ message: 'Dossier parent non trouvé' });
            }
        }

        const folder = await Folder.create({
            name,
            user: req.user._id,
            parent: parentId || null
        });

        res.status(201).json(folder);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Obtenir la structure des dossiers
const getFolderStructure = async (req, res) => {
    try {
        // Récupérer tous les dossiers de l'utilisateur
        const folders = await Folder.find({ user: req.user._id })
            .sort('order name');

        // Récupérer tous les documents avec leurs dossiers
        const documents = await Document.find({ user: req.user._id })
            .select('title folder createdAt updatedAt')
            .sort('-updatedAt');

        res.json({ folders, documents });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Déplacer un élément (dossier ou document)
const moveItem = async (req, res) => {
    try {
        const { itemId, itemType, targetFolderId } = req.body;

        if (targetFolderId) {
            // Vérifier que le dossier cible existe et appartient à l'utilisateur
            const targetFolder = await Folder.findOne({
                _id: targetFolderId,
                user: req.user._id
            });
            if (!targetFolder) {
                return res.status(404).json({ message: 'Dossier cible non trouvé' });
            }
        }

        if (itemType === 'folder') {
            // Empêcher de déplacer un dossier dans un de ses sous-dossiers
            if (targetFolderId) {
                const folder = await Folder.findById(itemId);
                if (folder._id.equals(targetFolderId)) {
                    return res.status(400).json({ message: 'Un dossier ne peut pas être déplacé dans lui-même' });
                }
            }

            await Folder.findOneAndUpdate(
                { _id: itemId, user: req.user._id },
                { parent: targetFolderId || null }
            );
        } else if (itemType === 'document') {
            await Document.findOneAndUpdate(
                { _id: itemId, user: req.user._id },
                { folder: targetFolderId || null }
            );
        }

        res.json({ message: 'Élément déplacé avec succès' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Renommer un dossier
const renameFolder = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const folder = await Folder.findOneAndUpdate(
            { _id: id, user: req.user._id },
            { name },
            { new: true }
        );

        if (!folder) {
            return res.status(404).json({ message: 'Dossier non trouvé' });
        }

        res.json(folder);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Supprimer un dossier
const deleteFolder = async (req, res) => {
    try {
        const { id } = req.params;

        // Vérifier s'il y a des documents dans le dossier
        const hasDocuments = await Document.exists({ folder: id });
        if (hasDocuments) {
            return res.status(400).json({
                message: 'Impossible de supprimer un dossier non vide'
            });
        }

        // Vérifier s'il y a des sous-dossiers
        const hasSubfolders = await Folder.exists({ parent: id });
        if (hasSubfolders) {
            return res.status(400).json({
                message: 'Impossible de supprimer un dossier contenant des sous-dossiers'
            });
        }

        await Folder.findOneAndDelete({ _id: id, user: req.user._id });
        res.json({ message: 'Dossier supprimé avec succès' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    createFolder,
    getFolderStructure,
    moveItem,
    renameFolder,
    deleteFolder
};