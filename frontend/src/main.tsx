import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { store } from './app/store';
import { antdTheme } from './theme/antdConfig';
import App from './App';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element (#root) not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <ConfigProvider theme={antdTheme}>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </ConfigProvider>
  </StrictMode>,
);

