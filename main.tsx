import React from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import Home from './app/page';
import './app/globals.css';
import './app/hero.css';
import './app/digital-check/digital-check.css';
const root=document.getElementById('root')!;
const app=<React.StrictMode><Home initialPath={window.location.pathname.replace(/\/$/,'') || '/'}/></React.StrictMode>;
if(root.hasChildNodes()) hydrateRoot(root,app); else createRoot(root).render(app);

import './app/audit.css';
