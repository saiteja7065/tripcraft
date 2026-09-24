import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import compression from 'compression'
import express from 'express'
import { createGenerateHandler } from './generate.js'
import { buildProviders } from './providers/index.js'

// node 22 can read .env itself, no dotenv needed. missing file is fine.
try {
  process.loadEnvFile()
} catch {}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const providers = buildProviders()
const app = express()

app.disable('x-powered-by')
app.set('trust proxy', 1) // render sits behind a proxy, needed for req.ip
app.use(compression())
app.use(express.json({ limit: '64kb' }))

// cheap endpoint the client pings on load - wakes a sleeping render instance
// while the user is still typing, and tells the ui if we're in demo mode
app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json({ ok: true, demo: providers.demo, providers: providers.list.map((p) => p.name) })
})

app.post('/api/generate', createGenerateHandler(providers))

app.use('/api', (req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No such endpoint.' } })
})

if (existsSync(dist)) {
  // hashed assets never change, cache them hard. index.html must always be fresh
  // or users get stuck on an old build after a deploy.
  app.use(
    '/assets',
    express.static(join(dist, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }),
  )
  app.use(express.static(dist, { index: false, maxAge: '1h' }))
  app.get('/{*splat}', (req, res) => {
    res.set('Cache-Control', 'no-cache')
    res.sendFile(join(dist, 'index.html'))
  })
} else {
  app.get('/', (req, res) => res.send('No build found. Run `npm run build` or use `npm run dev`.'))
}

// body-parser errors (bad json, too large) + anything unexpected
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  const status = err.status || err.statusCode || 500
  if (status >= 500) console.error(err)
  const code = status === 413 ? 'TOO_LARGE' : status < 500 ? 'BAD_INPUT' : 'SERVER'
  res.status(status).json({ error: { code, message: status < 500 ? 'Bad request.' : 'Server error.' } })
})

const port = Number(process.env.PORT) || 8787
app.listen(port, () => {
  const mode = providers.demo ? 'DEMO MODE (no api key found)' : providers.list.map((p) => `${p.name}:${p.model}`).join(' -> ')
  console.log(`api ready on http://localhost:${port}  [${mode}]`)
})
