import '@fontsource/vt323/400.css'
import '@fontsource/press-start-2p/400.css'
import '@fontsource/fira-code/400.css'
import '@fontsource/fira-code/500.css'
import './styles/global.css'
import './styles/crt.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { I18nProvider } from './i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
)
