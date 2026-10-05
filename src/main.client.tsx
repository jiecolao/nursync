import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="flex h-screen items-center justify-center text-xl font-semibold">
      Nursync Client is running!
    </div>
  </StrictMode>
);