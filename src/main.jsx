import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted variable fonts, bundled with the app.
import '@fontsource-variable/fraunces/wght.css'
import '@fontsource-variable/plus-jakarta-sans/wght.css'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
