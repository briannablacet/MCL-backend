const Stripe = require('stripe');
const User = require('../models/User');
const Subscription = require('../models/Subscription');

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const priceId = process.env.STRIPE_PRICE_ID;

const stripe = Stripe(stripeSecret);

exports.subscribe = async (req, res, next) => {
    try {
      const userId = req.user.id;
  
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ 
          status: "unsuccess", 
          data: { 
            message: 'User not found'
          }
        });
      }

      if (user.stripeInfo?.status === 'active') {
        return res.status(400).json({ 
          status: "unsusccess", 
          data: { 
            error: 'User already has an active subscription' 
          } 
        });
      }
  
      let customerId = user.stripeInfo?.customerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user._id.toString() }
        });
        customerId = customer.id;
      }
  
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${process.env.CLIENT_URL}/stripe/success`,
        cancel_url: `${process.env.CLIENT_URL}/stripe/cancel`,
        metadata: {
          userId: user._id.toString()
        }
      });

      user.stripeInfo.customerId = customerId;
      await user.save();
  
      return res.status(200).json({ 
        status: "success", 
        data: { 
          url: session.url
        }
      });
  
    } catch (error) {
      next(error);
    }
};

exports.cancel = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const subscription = await Subscription.findOne({ userId: userId, isActive: true });

    if (!subscription) {
      return res.status(404).json({ 
        status: "unsuccess", 
        data: { 
          message: 'No active subscription found'
        }
      });
    }

    const cancel = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    subscription.cancelAt = cancel.cancel_at ? new Date(cancel.cancel_at * 1000) : null;
    subscription.cancelAtPeriodEnd = cancel.cancel_at_period_end;
    subscription.isActive = false;
    subscription.canceledAt = cancel.canceled_at ? new Date(cancel.canceled_at * 1000) : null;
    await subscription.save();

    res.status(200).json({ 
      status: 'success', 
      data: { 
        message: 'Subscription canceled successfully' 
      } 
    });

  } catch (error) {
    next(error);
  }
};