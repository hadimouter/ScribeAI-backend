// backend/src/controllers/ai.js
const openAIService = require('../services/openai');
const subscriptionService = require('../services/subscription');

const aiAssistant = async (req, res) => {
  try {
    const { text, action, template, subject } = req.body; // Ajout de `template` et `subject`
    const user = req.user; // L'utilisateur est attaché par le middleware auth
    const userId = req.user._id;

    // Vérifier si l'utilisateur n'a pas dépassé sa limite
    const canMakeRequest = await subscriptionService.checkAIRequestLimit(userId);
    if (!canMakeRequest) {
      return res.status(403).json({
        message: 'Limite de requêtes IA atteinte pour votre plan'
      });
    }

    // Construire le prompt en fonction des nouveaux paramètres
    let prompt = '';
    switch (action) {
      case 'improve':
        prompt = `Améliorez ce texte en le rendant plus professionnel et engageant, tout en conservant son message principal : "${text}"`;
        break;
      case 'grammar':
        prompt = `Corrigez la grammaire, l'orthographe et la ponctuation de ce texte. Retournez uniquement le texte corrigé : "${text}"`;
        break;
      case 'suggest':
        prompt = `Proposez trois façons différentes de continuer ce texte : "${text}"`;
        break;
      case 'rephrase':
        prompt = `Reformulez ce texte de manière différente tout en gardant exactement le même sens : "${text}"`;
        break;
      case 'generate_template':
        prompt = `Voici un modèle pour un document académique : ${template} Sujet : "${subject}" Générez un texte complet et structuré en respectant le modèle et en développant le sujet de manière exhaustive.`;
        // Nouveau cas pour la génération basée sur un modèle
        if (!template || !subject) {
          return res.status(400).json({
            message: 'Template et sujet sont requis pour cette action.'
          });
        }
        prompt = `
          Utilisez le modèle suivant pour générer un contenu académique structuré. 
          Sujet : "${subject}"
          Modèle : "${template}"
        `;
        break;
      case 'bibliography':
        if (!subject) {
          return res.status(400).json({
            message: 'Les références et le style de citation sont requis'
          });
        }
        prompt = `
            Trouve des références bibliographiques fiables et pertinentes sur le sujet suivant : "${subject}". Concentre-toi sur les publications académiques, les livres spécialisés, les articles scientifiques, et les revues reconnues.

Critères :

Inclure des auteurs de référence et des publications récentes (5 à 10 dernières années si possible).
Prioriser les sources en Français .
Fournir au minimum 3 références avec des informations complètes : auteur(s), titre, éditeur, revue, année de publication, DOI (si disponible).
Préciser les disciplines concernées si le sujet est interdisciplinaire.
Trouver les meilleurs références bibliographiques disponible sur le marché.
Exemple de rendu attendu (Uniquement ça) :
"
Auteur(s) : [Nom, Prénom]
Titre : [Titre complet de l'œuvre]
Revue/Éditeur : [Revue ou maison d'édition]
Année : [Année de publication]
DOI ou Lien : [Insérez le DOI ou l'URL]"


          `;
        break;
      default:
        return res.status(400).json({ message: 'Action non valide' });
    }

    // Générer le texte avec OpenAI
    const response = await openAIService.generateCompletion(user, prompt);

    if (!response.success) {
      throw new Error(response.error);
    }
    await subscriptionService.incrementAIRequestCount(userId);

    res.json({
      suggestion: response.data,
      model: response.model
    });

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