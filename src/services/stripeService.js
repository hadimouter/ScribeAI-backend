const { stripe, STRIPE_PLANS } = require('../config/stripe');
const User = require('../models/User');
const Subscription = require('../models/Subscription');

class StripeService {
  async createCustomer(user) {
    try {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: user._id.toString()
        }
      });

      await User.findByIdAndUpdate(user._id, { stripeCustomerId: customer.id });
      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  async createCheckoutSession(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await this.createCustomer(user);
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: STRIPE_PLANS.PREMIUM.id,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_URL}/dashboard/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/dashboard/subscription`,
        metadata: {
          userId: userId.toString()
        },
        subscription_data: {
          trial_period_days: 14,
          metadata: {
            userId: userId.toString()
          }
        }
      });

      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId) {
    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });

      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: subscriptionId },
        { cancelAtPeriodEnd: true }
      );

      return true;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  async handleWebhook(event) {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this._handleCheckoutSessionCompleted(event.data.object);
          break;
        
        case 'customer.subscription.deleted':
          await this._handleSubscriptionDeleted(event.data.object);
          break;
        
        case 'customer.subscription.updated':
          await this._handleSubscriptionUpdated(event.data.object);
          break;
          
        case 'customer.subscription.trial_will_end':
          await this._handleTrialWillEnd(event.data.object);
          break;
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  constructWebhookEvent(payload, signature) {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  }

  // Méthodes privées pour gérer les webhooks
  async _handleCheckoutSessionCompleted(session) {
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      await Subscription.create({
        user: session.metadata.userId,
        stripeSubscriptionId: subscription.id,
        status: 'active',
        isTrialing: subscription.trial_end != null,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      });
    }
  }

  async _handleSubscriptionDeleted(subscription) {
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      { status: 'inactive', cancelAtPeriodEnd: false }
    );
  }

  async _handleSubscriptionUpdated(subscription) {
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        status: subscription.status,
        isTrialing: subscription.trial_end != null
      }
    );
  }

  async _handleTrialWillEnd(subscription) {
    // Vous pouvez ajouter ici une logique pour notifier l'utilisateur
    // que sa période d'essai se termine bientôt
    console.log('Trial will end for subscription:', subscription.id);
  }
}

module.exports = new StripeService();