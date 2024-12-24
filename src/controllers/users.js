const subscriptionService = require('../services/subscription');
const User = require('../models/User');
const Document = require('../models/Document');
const Subscription = require('../models/Subscription');
const bcrypt = require('bcryptjs');

const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Récupérer les limites du plan et l'abonnement
    const planLimits = await subscriptionService.getPlanLimits(userId);
    const currentPlan = await subscriptionService.getUserPlan(userId);
    const subscription = await Subscription.findOne({ user: userId });

    // Récupérer l'utilisation actuelle
    const user = await User.findById(userId);
    const documentsCount = await Document.countDocuments({
      user: userId,
      createdAt: {
        $gte: new Date(new Date().setDate(1)) // Depuis le début du mois
      }
    });

    // Calculer les jours restants dans la période
    let daysLeftInPeriod = 30;
    if (subscription && subscription.currentPeriodEnd) {
      const now = new Date();
      const endDate = new Date(subscription.currentPeriodEnd);
      daysLeftInPeriod = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    }

    res.json({
      aiRequestsUsed: user.aiRequestsCount || 0,
      aiRequestsTotal: planLimits.aiRequests,
      documentsUsed: documentsCount,
      documentsTotal: planLimits.documentsPerMonth,
      currentPlan,
      daysLeftInPeriod,
      model: planLimits.model,
      subscription: subscription ? {
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        currentPeriodEnd: subscription.currentPeriodEnd,
        plan: subscription.plan
      } : null
    });

  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des statistiques'
    });
  }
};

const getCurrentSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });
    if (!subscription) {
      return res.json({
        plan: 'free',
        status: 'inactive',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false
      });
    }
    res.json(subscription);
  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération de l\'abonnement'
    });
  }
};


const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, verifyEmail } = req.body;
    const userId = req.user._id;

    // Vérifier si l'email de vérification correspond à l'email actuel
    if (verifyEmail !== req.user.email) {
      return res.status(400).json({
        message: 'L\'adresse email de vérification est incorrecte'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName },
      { new: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      message: 'Erreur lors de la mise à jour du profil'
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validation du nouveau mot de passe
    if (newPassword.length < 8) {
      return res.status(400).json({
        message: 'Le nouveau mot de passe doit contenir au moins 8 caractères'
      });
    }

    const user = await User.findById(req.user._id);

    // Vérifier l'ancien mot de passe
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        message: 'Mot de passe actuel incorrect'
      });
    }

    // Au lieu de définir directement le mot de passe
    // Utilisons findByIdAndUpdate pour éviter les validations du modèle
    await User.findByIdAndUpdate(user._id, {
      $set: { password: bcrypt.hashSync(newPassword, 10) }
    });

    res.json({
      message: 'Mot de passe modifié avec succès'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      message: 'Erreur lors du changement de mot de passe'
    });
  }
};



module.exports = {
  getUserStats,
  getCurrentSubscription,
  updateProfile,
  changePassword
};