import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import '../style.css';
import { store, persistor } from '../store/store';
import { PopupHeader } from '../components/PopupHeader';
import { PopupContent } from '../components/PopupContent';
import { useTheme } from '../hooks/useTheme';
import styles from './index.module.css';

const Popup: React.FC = () => {
  // 使用 useTheme hook 确保主题同步和响应
  useTheme();

  return (
    <div className={styles.container}>
      <PopupHeader title="React Extension" />
      <PopupContent />
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);

  // 使用 PersistGate 等待持久化数据加载
  root.render(
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Popup />
      </PersistGate>
    </Provider>
  );
}
