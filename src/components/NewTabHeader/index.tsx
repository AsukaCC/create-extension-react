import React from 'react';
import styles from './index.module.css';

interface NewTabHeaderProps {
  title: string;
}

export const NewTabHeader: React.FC<NewTabHeaderProps> = ({ title }) => {
  return (
    <header className={styles.header}>
      <h1>{title}</h1>
    </header>
  );
};
