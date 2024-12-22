const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const STRIPE_PLANS = {
  PREMIUM: {
    id: process.env.STRIPE_PREMIUM_PRICE_ID,
    name: 'premium',
    displayName: 'Premium',
    price: 9.99
  }
};

module.exports = {
  stripe,
  STRIPE_PLANS
};