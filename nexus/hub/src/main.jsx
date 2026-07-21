import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Jarvis from './Jarvis.jsx'
import VistaGeneral from './VistaGeneral.jsx'
import './styles.css'

// Enrutado liviano por pathname (el server hace catch-all a index.html).
const path = window.location.pathname
const esChat = path.startsWith('/chat')
const esVista = path.startsWith('/vista')

createRoot(document.getElementById('root')).render(
  esVista ? <VistaGeneral /> : esChat ? <Jarvis /> : <App />,
)
