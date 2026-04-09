const router = require('express').Router()
const { pool } = require('../db')

// ── Auth Middleware ────────────────────────────────────
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next()
  res.status(401).json({ error: 'Authentication required' })
}

// ── GET /api/dashboard ────────────────────────────────
router.get('/dashboard', ensureAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const userResult = await pool.query(
      'SELECT id, email, name, avatar_url, plan, created_at FROM users WHERE id=$1',
      [userId]
    )
    const user = userResult.rows[0]
    if (!user) return res.status(404).json({ error: 'User not found' })

    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users')

    res.json({
      user,
      stats: {
        plan: user.plan,
        memberSince: user.created_at,
        totalPlatformCreators: parseInt(totalUsers.rows[0].count, 10)
      }
    })
  } catch (err) {
    console.error('Dashboard error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── GET /api/recommendations ──────────────────────────
router.get('/recommendations', ensureAuth, async (req, res) => {
  try {
    const recommendations = [
      {
        id: 1,
        title: 'Optimize your content schedule',
        description: 'Post consistently between 9-11 AM for maximum engagement.',
        category: 'growth',
        priority: 'high'
      },
      {
        id: 2,
        title: 'Diversify revenue streams',
        description: 'Consider adding digital products or paid community access.',
        category: 'monetization',
        priority: 'medium'
      },
      {
        id: 3,
        title: 'Engage with your audience',
        description: 'Reply to comments within the first hour to boost algorithm visibility.',
        category: 'engagement',
        priority: 'high'
      },
      {
        id: 4,
        title: 'Upgrade to Pro',
        description: 'Unlock AI-powered analytics and advanced monetization tools.',
        category: 'upgrade',
        priority: 'low'
      }
    ]

    res.json({ recommendations })
  } catch (err) {
    console.error('Recommendations error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
