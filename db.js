const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
})

async function initDB() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        email         VARCHAR(255) UNIQUE NOT NULL,
        name          VARCHAR(255),
        avatar_url    TEXT,
        provider      VARCHAR(50),
        provider_id   VARCHAR(255),
        plan          VARCHAR(50) DEFAULT 'free',
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    console.log('✅ Database initialized — users table ready')
  } finally {
    client.release()
  }
}

module.exports = { pool, initDB }
