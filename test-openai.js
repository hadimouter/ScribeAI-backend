require('dotenv').config();

const { OpenAI } = require('openai');  // Remplacez Configuration par OpenAI

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  // Utilisation de la clé API depuis .env
});

(async () => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',  // Utilisez un modèle valide, par exemple gpt-3.5-turbo
      messages: [{ role: 'user', content: 'Hello, world!' }],
    });
    console.log(response);
  } catch (error) {
    console.error('Error initializing OpenAI:', error);
  }
})();
