const pdf = require('html-pdf');
const officegen = require('officegen');
const fs = require('fs');
const path = require('path');

class ExportService {
  async generatePDF(content, title) {
    try {
      // Lancer le navigateur
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: 'new'
      });

      // Créer une nouvelle page
      const page = await browser.newPage();

      // Le HTML à convertir
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            ${content}
          </body>
        </html>
      `;

      // Définir le contenu
      await page.setContent(html);

      // Générer le PDF
      const buffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });

      // Fermer le navigateur
      await browser.close();

      return buffer;
    } catch (error) {
      console.error('PDF Generation Error:', error);
      throw error;
    }
  }

  async generateDOCX(content, title) {
    return new Promise((resolve, reject) => {
      try {
        // Créer un nouveau document
        const docx = officegen({
          type: 'docx',
          author: 'ScribeAI',
          title: title
        });

        // Gérer les événements
        docx.on('error', (err) => {
          console.error('Error in docx generation:', err);
          reject(err);
        });

        // Créer un fichier temporaire pour stocker le document
        const tempFilePath = path.join(__dirname, `../../temp/${Date.now()}_${title}.docx`);

        // Ajouter le titre
        const titleParagraph = docx.createP();
        titleParagraph.addText(title, {
          bold: true,
          font_face: 'Arial',
          font_size: 16
        });

        // Ajouter un espace après le titre
        docx.createP();

        // Traiter le contenu HTML
        const cleanContent = content.replace(/<[^>]*>/g, ''); // Retire les balises HTML
        const contentParagraph = docx.createP();
        contentParagraph.addText(cleanContent, {
          font_face: 'Arial',
          font_size: 12
        });

        // Créer le fichier
        const out = fs.createWriteStream(tempFilePath);

        out.on('error', (err) => {
          console.error('Error in file stream:', err);
          reject(err);
        });

        // Quand le fichier est créé
        out.on('finish', () => {
          // Lire le fichier et le retourner comme buffer
          fs.readFile(tempFilePath, (err, buffer) => {
            // Supprimer le fichier temporaire
            fs.unlink(tempFilePath, (unlinkErr) => {
              if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
            });

            if (err) reject(err);
            else resolve(buffer);
          });
        });

        // Générer le document
        docx.generate(out);

      } catch (error) {
        console.error('Error in DOCX generation:', error);
        reject(error);
      }
    });
  }
}


const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

module.exports = new ExportService();