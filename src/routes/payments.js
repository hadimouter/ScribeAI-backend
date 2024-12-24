//backend/src/routes/payements.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const stripeService = require('../services/stripeService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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

router.post('/create-portal-session', protect, async (req, res) => {
  try {
    // Récupérer le customer ID via votre service
    const customerId = await stripeService.getCustomerId(req.user._id);
    
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard/subscription`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({ message: 'Erreur création session portail' });
  }
});

module.exports = router;