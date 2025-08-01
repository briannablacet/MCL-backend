const express = require('express');
const Stripe = require('stripe');
const axios = require('axios');
require('../utils/stripeCron');

const router = express.Router();
const User = require('../models/User');
const Subscription = require('../models/Subscription');

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const hubspotSecret = process.env.HUBSPOT_API_KEY;
const STRIPE_SUBSCRIBED_WEBHOOK_SECRET = process.env.STRIPE_SUBSCRIBED_WEBHOOK_SECRET;
const STRIPE_PAYMENT_COMPLETED_WEBHOOK_SECRET = process.env.STRIPE_PAYMENT_COMPLETED_WEBHOOK_SECRET;
const STRIPE_UPDATED_WEBHOOK_SECRET = process.env.STRIPE_UPDATED_WEBHOOK_SECRET;

const stripe = Stripe(stripeSecret);

const headers = {
    Authorization: `Bearer ${hubspotSecret}`,
    'Content-Type': 'application/json'
}

router.post('/subscribed', express.raw({ type: 'application/json' }), async (req, res) => {

  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_SUBSCRIBED_WEBHOOK_SECRET);
  } catch (err) {
    console.log("Subscription Webhook Error:", err);
  }
  
  if (event.type === 'checkout.session.completed') {

    const session = event.data.object;
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    const metadata = session.metadata;

    try {

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        const newSubscription = await Subscription.create({
            userId: metadata.userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0].price.id,
            planName: subscription.items.data[0].price.nickname || 'Pro Subscription',
            status: subscription.status,
            currentPeriodStart: subscription.items?.data[0]?.current_period_start ? new Date(subscription.items?.data[0]?.current_period_start * 1000) : null,
            currentPeriodEnd: subscription.items?.data[0]?.current_period_end ? new Date(subscription.items?.data[0]?.current_period_end * 1000) : null,
            cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
            isActive: subscription.status === 'active',
            metadata: session.metadata,
            currency: subscription.currency,
            amount: subscription.items?.data[0]?.plan?.amount / 100 || 0
        });

        const user = await User.findOneAndUpdate(
            { _id: metadata.userId },
            { $set: { 'stripeInfo.status': subscription.status } },
            { new: true }
        );

        const firstName = user.name.split(' ')[0];
        const lastName = user.name.split(' ').slice(1).join(' ') || '';

        const contactInputs = [{
            "idProperty": "email",
            "id": user.email,
            "properties": {
              "email": user.email,
              "lastname": lastName,
              "firstname": firstName,
              "db_user_id": user._id.toString(),
              "stripe_status": subscription.status,
            }
        }];

        const createUserUrl = `https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert`;
        const contacts = await axios.post(createUserUrl,{ inputs: contactInputs },{ headers });

        const contactId = user.hsInfo?.hsContactId || contacts?.data?.results[0]?.id;
        let dealId = user.hsInfo?.hsDealId;

        const properties = {
            "dealname": `${user?.name} (Pro Subscription)`,
            "subscription_amount": subscription.items?.data[0]?.plan?.amount / 100 || 0,
            "last_renewal_date": newSubscription.currentPeriodStart.toISOString().split('T')[0],
            "next_renewal_date": newSubscription.currentPeriodEnd.toISOString().split('T')[0],
            "stripe_subscription_id": subscription.id,
            "dealstage": "contractsent",
            "stripe_status": subscription.status,
            "db_subscription_id": newSubscription._id.toString(),
        };

        if (dealId) {
            const updateDealUrl = `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`;
            await axios.patch(updateDealUrl, { properties }, { headers });
        } else {
            properties.pipeline = "default";
            properties.first_subscription_date = new Date();

            const createDealUrl = `https://api.hubapi.com/crm/v3/objects/deals`;
        
            const SimplePublicObjectInputForCreate = { associations: [
                {"types":[{"associationCategory":"HUBSPOT_DEFINED","associationTypeId":3}],"to":{"id":contactId}}
            ], properties };
        
            const dealResponse = await axios.post(createDealUrl, SimplePublicObjectInputForCreate, { headers });
            dealId = dealResponse?.data?.id;
        }

        await User.updateOne(
            { _id: metadata.userId },
            { $set: { 
                'hsInfo.hsContactId': contactId,
                'hsInfo.hsDealId': dealId,
            } 
        });

    } catch (err) {
        console.log("Subscription Error:", err);
    }
    res.status(200).send('Webhook received');
  }
});

router.post('/payment-succeeded', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_PAYMENT_COMPLETED_WEBHOOK_SECRET);
    } catch (err) {
        console.log("Payment Webhook Error:", err);
    }

    if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object;

        try {
            const user = await User.findOne({ email: invoice.customer_email });
            const contactId = user?.hsInfo?.hsContactId;
            const dealId = user?.hsInfo?.hsDealId;

            if (contactId && dealId) {            
                const createInvoiceUrl = `https://api.hubapi.com/crm/v3/objects/invoices`;
                const invoicePayload = {
                    "associations": [
                        { "types": [{ "associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 177 }], "to": { "id": contactId }},
                        { "types": [{ "associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 175 }], "to": { "id": dealId }},
                    ],
                    "properties": {
                        "hs_invoice_date": new Date(invoice.created * 1000),
                        "hs_currency": invoice.currency.toUpperCase(),
                        "subscription_amount": invoice.amount_paid / 100 || 0,
                        "hs_title": `${user?.name} (Pro Subscription)`,
                        "stripe_status": 'active',
                        "hs_amount_billed": invoice.amount_paid / 100 || 0,
                    }
                };
                
                const newInvoice = await axios.post(createInvoiceUrl, invoicePayload, { headers });

                const createLineItemUrl = `https://api.hubapi.com/crm/v3/objects/line_items`;
                const lineItemPayload = {
                    "associations": [
                        { "types": [{ "associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 410 }], "to": { "id": newInvoice?.data?.id }},
                    ],
                    "properties": {
                        "name": `Pro Subscription`,
                        "price": invoice.amount_paid / 100 || 0,
                        "quantity": 1,
                        "hs_product_id": 121837719232
                    }
                }
                const lineItem = await axios.post(createLineItemUrl, lineItemPayload, { headers });
    
                const createPaymentUrl = `https://api.hubapi.com/crm/v3/objects/commerce_payments`;
                const paymentPayload = {
                    "associations": [
                        { "types": [{ "associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 395 }], "to": { "id": lineItem?.data?.id }},
                    ],
                    "properties": {
                        "hs_initiated_date": new Date(),
                        "hs_billing_bill_to_name": `${user?.name} (Pro Subscription)`,
                        "hs_initial_amount": parseFloat(invoice.amount_paid) / 100 || 0,
                        "hs_payment_method_type": 'card',
                        "hs_latest_status": 'succeeded',
                        "hs_customer_email": user?.email
                    }
                }
    
                await axios.post(createPaymentUrl, paymentPayload, { headers });

                user.hsInfo.hsInvoiceId = newInvoice?.data?.id;
                await user.save();
            }
            
        } catch (err) {
            console.log("Payment Error:", err);
        }
        res.status(200).send('Webhook received');
    }
});

router.post('/updated', express.raw({ type: 'application/json' }), async (req, res) => {

    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_UPDATED_WEBHOOK_SECRET);
    } catch (err) {
        console.log("Update Webhook Error:", err);
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;

        const customerId = subscription.customer;
        const subscriptionId = subscription.id;

        try {
            const user = await User.findOneAndUpdate(
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
            const properties = {
                stripe_status: subscription.status,
            };
            if (subscription.status === 'active') {
                properties.dealstage = "contractsent";
            } else if (subscription.status === 'past_due') {
                properties.dealstage = "decisionmakerboughtin";
            } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
                properties.dealstage = "1763389169";
            }

            console.log(properties);

            const updateDealUrl = `https://api.hubapi.com/crm/v3/objects/deals/${subscriptionId}?idProperty=stripe_subscription_id`;
            await axios.patch(updateDealUrl, { properties }, { headers });

            delete properties.dealstage

            console.log(properties);

            const updateInvoiceUrl = `https://api.hubapi.com/crm/v3/objects/invoices/${user.hsInfo?.hsInvoiceId}`;
            await axios.patch(updateInvoiceUrl, { properties }, { headers });

            const updateContactUrl = `https://api.hubapi.com/crm/v3/objects/contacts/${user.hsInfo?.hsContactId}`;
            await axios.patch(updateContactUrl, { properties }, { headers });
        } catch (err) {
            console.log("Update Error:", err);
        }
        res.status(200).send('Webhook received');
    }
});

module.exports = router;