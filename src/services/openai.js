const openai = require('../config/openai');
const subscriptionService = require('./subscription');

class OpenAIService {
  constructor() {
    this.defaultModel = "gpt-3.5-turbo";
    this.premiumModel = "gpt-4";
  }

  async getModelForUser(userId) {
    try {
      const userPlan = await subscriptionService.getUserPlan(userId);
      return userPlan === 'premium' ? this.premiumModel : this.defaultModel;
    } catch (error) {
      console.error('Error getting user model:', error);
      return this.defaultModel; // En cas d'erreur, on utilise le modèle par défaut
    }
  }

  async generateCompletion(user, prompt) {
    try {
      const model = await this.getModelForUser(user._id);

      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: "Vous êtes un assistant de rédaction expert en français, spécialisé dans l'amélioration de texte."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      });

      return {
        success: true,
        data: completion.choices[0].message.content,
        model: model
      };

    } catch (error) {
      console.error('OpenAI Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

const openAIService = new OpenAIService();
module.exports = openAIService;