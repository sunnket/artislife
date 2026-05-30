import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/global.css'

// Note: intentionally not wrapped in <StrictMode>. R3F + imperative libs (GSAP,
// Tone.js, manual listeners) behave more predictably without dev double-invoke.
createRoot(document.getElementById('root')!).render(<App />)
