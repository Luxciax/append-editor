import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.scss';
import * as serviceWorker from './serviceWorker';
import reportWebVitals from './reportWebVitals';

import AppendEditor from './components/AppendEditor';
import './stylesheets/main.scss';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Unable to find the root element');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <AppendEditor />
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

// If you want to start measuring performance, pass a function to log results.
reportWebVitals();
