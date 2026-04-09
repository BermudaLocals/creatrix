const router = require('express').Router()
const passport = require('passport')

// ── Google OAuth ──────────────────────────────────────
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}))

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/dashboard')
)

// ── GitHub OAuth ──────────────────────────────────────
router.get('/github', passport.authenticate('github', {
  scope: ['user:email']
}))

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/dashboard')
)

// ── Logout ────────────────────────────────────────────
router.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err)
    res.redirect('/')
  })
})

// ── Current User ──────────────────────────────────────
router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  const { id, email, name, avatar_url, plan, created_at } = req.user
  res.json({ user: { id, email, name, avatar_url, plan, created_at } })
})

module.exports = router
