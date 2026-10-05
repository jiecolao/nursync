import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="flex h-screen items-center justify-center text-xl font-semibold">
      Nursync Client is running!
    </div>
  </React.StrictMode>
);