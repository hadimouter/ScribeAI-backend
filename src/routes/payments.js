const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const stripeService = require('../services/stripeService');

// Créer une session de paiement
router.post('/create-checkout-session', protect, async (req, res) => {
  try {
    const session = await stripeService.createCheckoutSession(req.user._id);
    res.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(400).json({ message: error.message });
  }
});

// Annuler un abonnement
router.post('/cancel-subscription', protect, async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    await stripeService.cancelSubscription(subscriptionId);
    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Webhook Stripe
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripeService.constructWebhookEvent(req.body, sig);
    await stripeService.handleWebhook(event);
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;