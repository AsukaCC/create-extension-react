import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import '../style.css';
import { store, persistor } from '../store/store';
import { NewTabHeader } from '../components/NewTabHeader';
import ThemeButton from '../components/ThemeButton';
import { useTheme } from '../hooks/useTheme';
import { BookmarksContent } from '../components/BookmarksContent';
import styles from './index.module.css';

const BookmarksApp: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div className={styles.container}>
      <div className={styles.themeButtonWrapper}>
        <ThemeButton isDarkMode={isDarkMode} onChange={toggleTheme} />
      </div>
      <NewTabHeader title="React Extension - Bookmarks" />
      <BookmarksContent />
    </div>
  );
};

const BookmarksPage: React.FC = () => {
  return <BookmarksApp />;
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);

  root.render(
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BookmarksPage />
      </PersistGate>
    </Provider>
  );
}
