import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as ReactRouterDOM from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SchoolYearProvider } from './contexts/SchoolYearContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ReactRouterDOM.HashRouter>
      <NotificationProvider>
        <AuthProvider>
          <SchoolYearProvider>
            <App />
          </SchoolYearProvider>
        </AuthProvider>
      </NotificationProvider>
    </ReactRouterDOM.HashRouter>
  </React.StrictMode>
);