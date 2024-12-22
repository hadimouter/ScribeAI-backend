const subscriptionService = require('../services/subscription');
const User = require('../models/User');
const Document = require('../models/Document');
const Subscription = require('../models/Subscription');

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

module.exports = {
  getUserStats,
  getCurrentSubscription
};