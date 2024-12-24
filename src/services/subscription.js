// backend/src/services/subscription.js
const User = require('../models/User');
const Subscription = require('../models/Subscription');

class SubscriptionService {
  PREMIUM_LIMITS = {
    aiRequests: 500,
    model: 'gpt-4',
    documentsPerMonth: 100
  };

  RESTRICTED_LIMITS = {
    aiRequests: 20,
    model: 'gpt-3.5-turbo',
    documentsPerMonth: 5
  };

  async getUserPlan(userId) {
    try {
      const subscription = await Subscription.findOne({ user: userId });
      return (subscription?.status === 'active' || subscription?.isTrialing) ? 'premium' : 'restricted';
    } catch (error) {
      console.error('Error getting user plan:', error);
      return 'restricted';
    }
  }


  async getPlanLimits(userId) {
    try {
      const subscription = await Subscription.findOne({ user: userId });
      return (subscription?.status === 'active' || subscription?.isTrialing) ? this.PREMIUM_LIMITS : this.RESTRICTED_LIMITS;
    } catch (error) {
      console.error('Error getting plan limits:', error);
      return this.RESTRICTED_LIMITS;
    }
  }

  async checkAIRequestLimit(userId) {
    try {
      const user = await User.findById(userId);
      const planLimits = await this.getPlanLimits(userId);
      
      // Reset count si nouveau mois
      const now = new Date();
      const lastReset = user.aiRequestsLastReset || new Date(0);
      
      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        await User.findByIdAndUpdate(userId, {
          aiRequestsCount: 0,
          aiRequestsLastReset: now
        });
        return true;
      }

      return user.aiRequestsCount < planLimits.aiRequests;
    } catch (error) {
      console.error('Error checking AI request limit:', error);
      return false;
    }
  }

  async incrementAIRequestCount(userId) {
    try {
      await User.findByIdAndUpdate(userId, {
        $inc: { aiRequestsCount: 1 }
      });
    } catch (error) {
      console.error('Error incrementing AI request count:', error);
    }
  }
}

const subscriptionService = new SubscriptionService();
module.exports = subscriptionService;