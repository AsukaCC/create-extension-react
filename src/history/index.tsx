import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import '../style.css';
import { store, persistor } from '../store/store';
import { NewTabHeader } from '../components/NewTabHeader';
import ThemeButton from '../components/ThemeButton';
import { useTheme } from '../hooks/useTheme';
import { HistoryContent } from '../components/HistoryContent';
import styles from './index.module.css';

const HistoryApp: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div className={styles.container}>
      <div className={styles.themeButtonWrapper}>
        <ThemeButton isDarkMode={isDarkMode} onChange={toggleTheme} />
      </div>
      <NewTabHeader title="React Extension - History" />
      <HistoryContent />
    </div>
  );
};

const HistoryPage: React.FC = () => {
  return <HistoryApp />;
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);

  root.render(
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <HistoryPage />
      </PersistGate>
    </Provider>
  );
}
