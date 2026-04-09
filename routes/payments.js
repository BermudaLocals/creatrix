const router = require('express').Router()
const express = require('express')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { pool } = require('../db')

const PLANS = {
  pro: {
    name: 'Pro',
    price: 2900,
    interval: 'month'
  },
  enterprise: {
    name: 'Enterprise',
    price: 9900,
    interval: 'month'
  }
}

// ── Stripe Webhook — POST /api/payments/webhook ───────
// server.js mounts this router at /api/payments/webhook before express.json()
// so req.body is the raw Buffer needed by Stripe signature verification.
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.userId
        const plan = session.metadata?.plan

        if (userId && plan) {
          await pool.query('UPDATE users SET plan=$1 WHERE id=$2', [plan, userId])
          console.log(`✅ User ${userId} upgraded to ${plan}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const userId = subscription.metadata?.userId
        if (userId) {
          await pool.query("UPDATE users SET plan='free' WHERE id=$1", [userId])
          console.log(`⬇️  User ${userId} downgraded to free`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error('Webhook processing error:', err)
  }

  res.json({ received: true })
})

// ── Auth Middleware ────────────────────────────────────
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next()
  res.status(401).json({ error: 'Authentication required' })
}

// ── POST /api/payments/create-checkout ─────────────────
router.post('/create-checkout', ensureAuth, async (req, res) => {
  try {
    const { plan } = req.body

    if (!PLANS[plan]) {
      return res.status(400).json({ error: 'Invalid plan. Choose pro or enterprise.' })
    }

    const planConfig = PLANS[plan]

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Creatrix ${planConfig.name}`,
            description: `Creatrix ${planConfig.name} — monthly subscription`
          },
          unit_amount: planConfig.price,
          recurring: { interval: planConfig.interval }
        },
        quantity: 1
      }],
      metadata: {
        userId: String(req.user.id),
        plan
      },
      success_url: `${process.env.APP_URL}/dashboard?upgraded=${plan}`,
      cancel_url: `${process.env.APP_URL}/pricing`
    })

    res.json({ url: session.url, sessionId: session.id })
  } catch (err) {
    console.error('Checkout error:', err)
    res.status(500).json({ error: 'Failed to create checkout session' })
  }
})

module.exports = router
