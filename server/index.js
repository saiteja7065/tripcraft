import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import compression from 'compression'
import express from 'express'
import { createGenerateHandler } from './generate.js'
import { buildProviders } from './providers/index.js'

// Node 22 loads .env natively; a missing file is not an error.
try {
  process.loadEnvFile()
} catch {}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const providers = buildProviders()
const app = express()

app.disable('x-powered-by')
app.set('trust proxy', 1) // behind the host's proxy; needed for a correct req.ip
app.use(compression())
app.use(express.json({ limit: '64kb' }))

// Pinged on page load: wakes a sleeping instance early and reports demo mode.
app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json({ ok: true, demo: providers.demo, providers: providers.list.map((p) => p.name) })
})

app.post('/api/generate', createGenerateHandler(providers))

app.use('/api', (req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No such endpoint.' } })
})

if (existsSync(dist)) {
  // Hashed assets are immutable; index.html is never cached so deploys take effect.
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

// Malformed or oversized bodies, and any unexpected error.
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
