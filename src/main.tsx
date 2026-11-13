import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { printConsoleSignature } from './consoleSignature';
import { initAnimatedFavicon } from './utils/animatedFavicon';

printConsoleSignature();
initAnimatedFavicon();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
