const fileExtractor = require('../services/fileExtractor');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const extractContent = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    let content = '';
    
    switch (req.file.mimetype) {
      case 'text/plain':
        content = req.file.buffer.toString('utf-8');
        break;
      case 'application/pdf':
        content = await fileExtractor.extractFromPDF(req.file.buffer);
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        content = await fileExtractor.extractFromDOCX(req.file.buffer);
        break;
      default:
        return res.status(400).json({ 
          message: 'Format de fichier non supporté' 
        });
    }

    res.json({ content });
  } catch (error) {
    console.error('Erreur extraction:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'extraction du contenu',
      error: error.message 
    });
  }
};

module.exports = {
  extractContent,
  upload
};