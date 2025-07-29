const express = require('express');
const Stripe = require('stripe');

const router = express.Router();
const User = require('../models/User');
const Subscription = require('../models/Subscription');

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const STRIPE_SUBSCRIBED_WEBHOOK_SECRET = process.env.STRIPE_SUBSCRIBED_WEBHOOK_SECRET;
const STRIPE_CANCELED_WEBHOOK_SECRET = process.env.STRIPE_CANCELED_WEBHOOK_SECRET;
const STRIPE_UPDATED_WEBHOOK_SECRET = process.env.STRIPE_UPDATED_WEBHOOK_SECRET;

const stripe = Stripe(stripeSecret);

router.post('/subscribed', express.raw({ type: 'application/json' }), async (req, res) => {

  res.status(200).send('Webhook received');

  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_SUBSCRIBED_WEBHOOK_SECRET);
  } catch (err) {
    return;
  }
  
  if (event.type === 'checkout.session.completed') {

    const session = event.data.object;
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    const metadata = session.metadata;

    try {

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        const currentPeriodStart = subscription.start_date ? new Date(subscription.start_date * 1000) : null;
        const currentPeriodEnd = new Date();
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

        await Subscription.create({
            userId: metadata.userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            planName: subscription.items.data[0].price.nickname || 'Default Plan',
            status: subscription.status,
            currentPeriodStart: currentPeriodStart,
            currentPeriodEnd: currentPeriodEnd,
            cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
            isActive: subscription.status === 'active',
            metadata: session.metadata,
            currency: subscription.currency,
        });

        await User.updateOne(
            { _id: metadata.userId },
            {
                $set: {
                    'stripeInfo.status': subscription.status,
                }
            }
        );

    } catch (err) {
        return;
    }
    }
});

router.post('/canceled', express.raw({ type: 'application/json' }), async (req, res) => {
    res.status(200).send('Webhook received');
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_CANCELED_WEBHOOK_SECRET);
    } catch (err) {
        return;
    }

    if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;

        const customerId = subscription.customer;
        const subscriptionId = subscription.id;

        await User.findOneAndUpdate(
            { 'stripeInfo.customerId': customerId },
            {
            $set: {
                'stripeInfo.status': subscription.status,
            },
            }
        );

        await Subscription.findOneAndUpdate(
            { stripeSubscriptionId: subscriptionId },
            {
            $set: {
                status: subscription.status,
            },
            }
        );
    }
    return;
});

router.post('/updated', express.raw({ type: 'application/json' }), async (req, res) => {
    res.status(200).send('Webhook received');
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_UPDATED_WEBHOOK_SECRET);
    } catch (err) {
        return;
    }

    if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object;

        const customerId = subscription.customer;
        const subscriptionId = subscription.id;

        await User.findOneAndUpdate(
            { 'stripeInfo.customerId': customerId },
            {
            $set: {
                'stripeInfo.status': subscription?.status,
            },
            }
        );

        await Subscription.findOneAndUpdate(
            { stripeSubscriptionId: subscriptionId },
            {
            $set: {
                status: subscription?.status,
            },
            }
        );
    }

    return;
});

module.exports = router;