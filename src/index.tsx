import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { App } from './components/App';
import { ClerkProvider } from '@clerk/clerk-react';

const publishableKey = (window as any).__CLERK_KEY__ || process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) throw new Error('Missing Clerk publishable key');

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={publishableKey}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
);
