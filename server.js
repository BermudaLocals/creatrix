require('dotenv').config()

const express = require('express')
const session = require('express-session')
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const GitHubStrategy = require('passport-github2').Strategy
const helmet = require('helmet')
const cors = require('cors')
const path = require('path')
const { pool, initDB } = require('./db')

const app = express()
const PORT = process.env.PORT || 3000

// ── TRUST PROXY (Railway runs behind reverse proxy) ──
app.set('trust proxy', 1)

// ── SECURITY ──────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: process.env.APP_URL, credentials: true }))

// ── BODY PARSING ──────────────────────────────────────
// Webhook needs raw body — mount BEFORE express.json()
app.use('/api/payments/webhook', require('./routes/payments'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── SESSION ───────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'creatrix-dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}))

// ── PASSPORT ──────────────────────────────────────────
app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((user, done) => done(null, user.id))
passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id=$1', [id])
    done(null, result.rows[0] || null)
  } catch (err) {
    done(err, null)
  }
})

async function findOrCreateUser(profile, provider) {
  const email = profile.emails?.[0]?.value || `${profile.id}@${provider}.oauth`
  const name = profile.displayName || profile.username || email.split('@')[0]
  const avatar_url = profile.photos?.[0]?.value || null

  let result = await pool.query('SELECT * FROM users WHERE email=$1', [email])

  if (!result.rows.length) {
    result = await pool.query(
      `INSERT INTO users (email, name, avatar_url, provider, provider_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [email, name, avatar_url, provider, profile.id]
    )
  }
  return result.rows[0]
}

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.APP_URL}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const user = await findOrCreateUser(profile, 'google')
    done(null, user)
  } catch (err) {
    done(err, null)
  }
}))

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: `${process.env.APP_URL}/auth/github/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const user = await findOrCreateUser(profile, 'github')
    done(null, user)
  } catch (err) {
    done(err, null)
  }
}))

// ── ROUTES ────────────────────────────────────────────
app.use('/auth', require('./routes/auth'))
app.use('/api', require('./routes/api'))
app.use('/api/payments', require('./routes/payments'))

// ── HEALTH CHECK ──────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'creatrix', env: process.env.NODE_ENV })
})

// ── STATIC PAGES ──────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')))

// Serve SPA-style for dashboard/login/pricing
const pages = ['dashboard', 'login', 'pricing', 'onboarding']
pages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${page}.html`))
  })
})

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// ── 404 ───────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' })
  }
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'))
})

// ── START ─────────────────────────────────────────────
async function start() {
  await initDB()
  app.listen(PORT, () => {
    console.log(`🚀 Creatrix running on port ${PORT}`)
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`   App URL: ${process.env.APP_URL || `http://localhost:${PORT}`}`)
  })
}

start().catch(console.error)
