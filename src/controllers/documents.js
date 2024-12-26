const Document = require('../models/Document');
const subscriptionService = require('../services/subscription');

const createDocument = async (req, res) => {
  try {
    // Vérification des limites mensuelles
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const documentsCount = await Document.countDocuments({
      user: req.user._id,
      createdAt: { $gte: startOfMonth }
    });

    const planLimits = await subscriptionService.getPlanLimits(req.user._id);

    if (documentsCount >= planLimits.documentsPerMonth) {
      return res.status(403).json({
        message: `Limite de ${planLimits.documentsPerMonth} documents par mois atteinte`
      });
    }

    const { title, content, type, academicInfo } = req.body;

    // Validation pour les documents académiques
    if (type && ['thesis', 'memoir', 'internship_report', 'philosophical_essay'].includes(type)) {
      if (!academicInfo?.citationStyle) {
        return res.status(400).json({
          message: 'Le style de citation est requis pour les documents académiques'
        });
      }
    }

    const document = await Document.create({
      title,
      content,
      type,
      academicInfo,
      user: req.user._id
    });

    res.status(201).json(document);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, academicInfo } = req.body;

    const document = await Document.findOne({ _id: id, user: req.user._id });
    if (!document) {
      return res.status(404).json({ message: 'Document non trouvé' });
    }

    // Mise à jour du document avec gestion des références académiques
    const updates = {
      title,
      content,
      lastEditedAt: Date.now()
    };

    // Si c'est un document académique, mettre à jour les informations académiques
    if (document.type && ['thesis', 'memoir', 'internship_report', 'philosophical_essay'].includes(document.type)) {
      updates.academicInfo = {
        ...document.academicInfo,
        ...academicInfo
      };
    }

    const updatedDocument = await Document.findOneAndUpdate(
      { _id: id, user: req.user._id },
      updates,
      { new: true }
    );

    res.json(updatedDocument);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};



// Autres fonctions existantes...
const getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ user: req.user._id })
      .sort({ lastEditedAt: -1 });

    res.json(documents);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!document) {
      return res.status(404).json({ message: 'Document non trouvé' });
    }

    res.json(document);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!document) {
      return res.status(404).json({ message: 'Document non trouvé' });
    }

    res.json({ message: 'Document supprimé' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const generateDocumentWithAI = async (req, res) => {
  try {
    const { type, title, academicInfo, details } = req.body;

    if (!type || !title) {
      return res.status(400).json({ message: 'Type et titre requis' });
    }

    // Vérifie que le type est valide
    if (!['thesis', 'memoir', 'internship_report', 'philosophical_essay'].includes(type)) {
      return res.status(400).json({ message: 'Type de document invalide' });
    }

    // Appelle l'IA pour générer le contenu
    const prompt = `Génère un document de type ${type} intitulé "${title}". ${details || ''}`;
    const content = await openAIService.generateText(prompt);

    // Crée un document avec le contenu généré
    const document = await Document.create({
      title,
      content,
      type,
      academicInfo: {
        ...academicInfo,
        references: []
      },
      user: req.user._id
    });

    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
module.exports = {
  createDocument,
  updateDocument,
  getDocuments,
  getDocument,
  deleteDocument,
  generateDocumentWithAI
};




