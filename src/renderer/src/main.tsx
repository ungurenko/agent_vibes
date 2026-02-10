import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SettingsProvider } from '@/hooks/useSettings'
import { TooltipProvider } from '@/components/ui/tooltip'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider>
      <TooltipProvider delayDuration={300}>
        <App />
      </TooltipProvider>
    </SettingsProvider>
  </React.StrictMode>
)
