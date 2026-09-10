import React from 'react';
import {createRoot} from 'react-dom/client';
import Home from './app/page';
import './app/globals.css';
import './app/hero.css';
import './app/digital-check/digital-check.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><Home/></React.StrictMode>);
