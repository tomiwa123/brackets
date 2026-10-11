import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TransformApp } from './transform/TransformApp.tsx'
import { SpellingApp } from './spelling/SpellingApp.tsx'

// Personal transformation program lives on its own route, isolated from the
// game so its stores never mount. See src/transform/ and docs/transformation-plan.md.
const isTransform = window.location.pathname.startsWith('/transform')
const isSpelling = window.location.pathname.startsWith('/spelling')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isTransform ? <TransformApp /> : isSpelling ? <SpellingApp /> : <App />}
  </StrictMode>,
)
