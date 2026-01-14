import React from 'react';
import { useStorage } from '../../hooks/useStorage';
import styles from './index.module.css';

export const NewTabContent: React.FC = () => {
  const [count, setCount, loading] = useStorage<number>('newtab_count', 0);

  const handleIncrement = () => {
    setCount(count + 1);
  };

  if (loading) {
    return <div className={styles.loading}>加载中...</div>;
  }

  return (
    <main className={styles.content}>
      <div className={styles.card}>
        <h2>欢迎使用新标签页</h2>
        <p>这是一个使用 React + Vite 构建的新标签页</p>
        <div className={styles.counter}>
          <p>访问次数: {count}</p>
          <button onClick={handleIncrement} className={styles.button}>
            增加计数
          </button>
        </div>
      </div>
    </main>
  );
};
