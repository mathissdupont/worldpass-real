import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { IdentityProvider } from './lib/identityContext'
import { setupStatusRouter } from "./mocks/statusRouter";
import { initTheme } from './lib/theme';
initTheme();
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <IdentityProvider>
        <App />
      </IdentityProvider>
    </BrowserRouter>
  </React.StrictMode>
)

setupStatusRouter();