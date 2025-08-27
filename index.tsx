import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ApiKeyProvider } from './contexts/ApiKeyContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { QueueProgressProvider } from './components/QueueProgressProvider';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <ApiKeyProvider>
        <QueueProgressProvider>
          <App />
        </QueueProgressProvider>
      </ApiKeyProvider>
    </ThemeProvider>
  </React.StrictMode>
);