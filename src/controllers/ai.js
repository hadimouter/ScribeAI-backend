// backend/src/controllers/ai.js
const openAIService = require('../services/openai');
const subscriptionService = require('../services/subscription');

const aiAssistant = async (req, res) => {
  try {
    const { text, action, template, subject } = req.body;
    const user = req.user;
    const userId = req.user._id;

    const canMakeRequest = await subscriptionService.checkAIRequestLimit(userId);
    if (!canMakeRequest) {
      return res.status(403).json({
        message: 'Limite de requêtes IA atteinte pour votre plan'
      });
    }

    let prompt = '';
    switch (action) {
      case 'improve':
        prompt = `Améliorez ce texte en le rendant plus professionnel et engageant.
       Retournez UNIQUEMENT un objet JSON avec la structure suivante, sans texte avant ou après :
       {
         "improvedText": "Le texte amélioré ici",
         "changes": [
           "Liste des principales améliorations apportées"
         ],
         "suggestions": [
           "Suggestions supplémentaires pour améliorer davantage le texte"
         ]
       }

       Texte original : "${text}"`;
        break;

      case 'grammar':
        prompt = `Corrigez la grammaire, l'orthographe et la ponctuation de ce texte.
       Retournez UNIQUEMENT un objet JSON avec la structure suivante, sans texte avant ou après :
       {
         "correctedText": "Le texte corrigé ici",
         "corrections": [
           {
             "original": "Texte original erroné",
             "corrected": "Texte corrigé",
             "type": "Type d'erreur (grammaire/orthographe/ponctuation)"
           }
         ]
       }

       Texte à corriger : "${text}"`;
        break;

      case 'suggest':
        prompt = `Proposez trois façons différentes de continuer ce texte.
       Retournez UNIQUEMENT un objet JSON avec la structure suivante, sans texte avant ou après :
       {
         "originalContext": "Résumé du contexte original",
         "suggestions": [
           {
             "continuation": "Première suggestion de continuation",
             "style": "Style de cette continuation",
             "tone": "Ton de cette continuation"
           },
           {
             "continuation": "Deuxième suggestion de continuation",
             "style": "Style de cette continuation",
             "tone": "Ton de cette continuation"
           },
           {
             "continuation": "Troisième suggestion de continuation",
             "style": "Style de cette continuation",
             "tone": "Ton de cette continuation"
           }
         ]
       }

       Texte à continuer : "${text}"`;
        break;

      case 'rephrase':
        prompt = `Reformulez ce texte de manière différente.
       Retournez UNIQUEMENT un objet JSON avec la structure suivante, sans texte avant ou après :
       {
         "originalSummary": "Résumé du texte original",
         "rephrased": "Version reformulée",
         "preservedElements": ["Éléments clés préservés"],
         "changes": ["Changements principaux apportés"]
       }

       Texte à reformuler : "${text}"`;
        break;

      case 'generate_template':
        if (!template || !subject) {
          return res.status(400).json({
            message: 'Template et sujet sont requis pour cette action.'
          });
        }
        prompt = `Générez un document académique de type '${template}' sur le sujet suivant: "${subject}".
    
    Retournez UNIQUEMENT un objet JSON avec la structure suivante, sans texte avant ou après:
    {
      "sections": [
        {
          "heading": "Titre de la section",
          "content": "Contenu détaillé",
          "subsections": [
            {
              "heading": "Titre sous-section",
              "content": "Contenu détaillé"
            }
          ]
        }
      ]
    }
    
    Le document doit être complet et bien structuré avec un contenu pertinent pour chaque section.
    Pour un '${template}', assurez-vous d'inclure toutes les sections essentielles.
    Le contenu doit être en français et académique.`;
        break;

      case 'bibliography':
        if (!subject) {
          return res.status(400).json({
            message: 'Le sujet est requis pour la recherche bibliographique'
          });
        }
        prompt = `Recherchez des références bibliographiques sur le sujet suivant.
       Retournez UNIQUEMENT un objet JSON avec la structure suivante, sans texte avant ou après :
       {
         "references": [
           {
             "authors": ["Noms des auteurs"],
             "title": "Titre de l'œuvre",
             "publisher": "Éditeur ou revue",
             "year": "Année de publication",
             "doi": "DOI si disponible",
             "type": "Type de publication",
             "language": "Langue de la publication"
           }
         ],
         "keywords": ["Mots-clés pertinents"],
         "disciplines": ["Disciplines concernées"]
       }

       Sujet : "${subject}"`;
        break;

      case 'generate_quiz':
        prompt = `Générez un quiz de 10 questions à choix multiples.
       Retournez UNIQUEMENT un tableau JSON avec la structure suivante, sans texte avant ou après :
       [
         {
           "question": "La question ici",
           "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
           "correctAnswer": 0,
           "explanation": "Explication de la réponse correcte"
         }
       ]

       Contenu : "${text}"`;
        break;

      case 'generate_revision':
        prompt = `Créez une fiche de révision structurée.
       Retournez UNIQUEMENT un objet JSON avec la structure suivante, sans texte avant ou après :
       {
         "summary": "Le résumé ici",
         "keyPoints": ["Point clé 1", "Point clé 2", "Point clé 3"],
         "concepts": {
           "Concept 1": "Explication du concept 1",
           "Concept 2": "Explication du concept 2"
         },
         "examples": ["Exemple 1", "Exemple 2"]
       }

       Contenu : "${text}"`;
        break;

      default:
        return res.status(400).json({ message: 'Action non valide' });
    }

    const response = await openAIService.generateCompletion(user, prompt);

    if (!response.success) {
      throw new Error(response.error);
    }

    await subscriptionService.incrementAIRequestCount(userId);

    try {
      // Tenter de parser la réponse en JSON si ce n'est pas déjà fait
      const suggestion = typeof response.data === 'string'
        ? JSON.parse(response.data.replace(/```json\n|\n```/g, ''))
        : response.data;

      res.json({
        suggestion,
        model: response.model
      });
    } catch (parseError) {
      console.error('Erreur de parsing JSON:', parseError);
      throw new Error('La réponse n\'est pas dans le format JSON attendu');
    }

  } catch (error) {
    console.error('AI Assistant Error:', error);
    res.status(500).json({
      message: 'Erreur lors de la génération du texte',
      error: error.message
    });
  }
};

module.exports = {
  aiAssistant
};