// src/main.jsx
import { Amplify } from 'aws-amplify'
import outputs from '../amplify_outputs.json'

// ✅ Configure FIRST
Amplify.configure(outputs)

// Now import React, styles, and your app
import React from 'react'
import ReactDOM from 'react-dom/client'
import '@aws-amplify/ui-react/styles.css'
import './index.css'
import App from './App.jsx'

// (Optional sanity log)
console.log('Amplify auth config:', outputs.auth)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
