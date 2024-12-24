const pdf = require('pdf-parse');
const mammoth = require('mammoth');

class FileExtractorService {
  async extractFromPDF(buffer) {
    try {
      const data = await pdf(buffer);
      return data.text;
    } catch (error) {
      console.error('Erreur extraction PDF:', error);
      throw new Error('Impossible d\'extraire le contenu du PDF');
    }
  }

  async extractFromDOCX(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.error('Erreur extraction DOCX:', error);
      throw new Error('Impossible d\'extraire le contenu du DOCX');
    }
  }
}

module.exports = new FileExtractorService();