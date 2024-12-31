const openai = require('../config/openai');
const subscriptionService = require('./subscription');

class OpenAIService {
 constructor() {
   this.defaultModel = "gpt-3.5-turbo";
   this.premiumModel = "gpt-4";
   this.MAX_TOKENS = 4000;
 }

 async getModelForUser(userId) {
   try {
     const userPlan = await subscriptionService.getUserPlan(userId);
     return userPlan === 'premium' ? this.premiumModel : this.defaultModel;
   } catch (error) {
     console.error('Error getting user model:', error);
     return this.defaultModel;
   }
 }

 async generateCompletion(user, prompt) {
   try {
     const model = await this.getModelForUser(user._id);

     if (prompt.length > this.MAX_TOKENS * 4) {
       throw new Error('Le document est trop long pour être traité');
     }

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
       max_tokens: this.MAX_TOKENS
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

async generateSummary(content) {
  if (!content) {
    throw new Error('Aucun contenu à résumer');
  }
  const response = await this.generateCompletion(content, 'summarize');
  return response.success ? response.data : content;
}
}

const openAIService = new OpenAIService();
module.exports = openAIService;