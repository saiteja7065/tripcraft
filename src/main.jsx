import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// self-hosted variable fonts - bundled with the app, no request to google fonts
import '@fontsource-variable/fraunces/wght.css'
import '@fontsource-variable/plus-jakarta-sans/wght.css'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
