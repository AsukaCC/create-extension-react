import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import styles from './index.module.css';

const HISTORY_DAYS = 7;
const MAX_RESULTS = 20;

export const HistoryContent: React.FC = () => {
  const [items, setItems] = useState<chrome.history.HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const startTime = Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000;
    chrome.history.search(
      {
        text: '',
        startTime,
        maxResults: MAX_RESULTS,
      },
      (results) => {
        const sorted = [...results].sort(
          (a, b) => (b.lastVisitTime ?? 0) - (a.lastVisitTime ?? 0)
        );
        setItems(sorted);
        setLoading(false);
      }
    );
  }, []);

  const summary = useMemo(() => {
    if (loading) {
      return '正在加载最近的浏览记录...';
    }
    if (items.length === 0) {
      return `最近 ${HISTORY_DAYS} 天没有历史记录。`;
    }
    return `最近 ${HISTORY_DAYS} 天访问记录（最多 ${MAX_RESULTS} 条）。`;
  }, [items.length, loading]);

  const openItem = (url?: string) => {
    if (!url) {
      return;
    }
    chrome.tabs.create({ url });
  };

  return (
    <main className={styles.content}>
      <section className={styles.card}>
        <h2 className={styles.title}>浏览历史</h2>
        <p className={styles.summary}>{summary}</p>
        {loading ? (
          <div className={styles.loading}>加载中...</div>
        ) : (
          <div className={styles.list}>
            {items.map((item) => (
              <div key={item.id} className={styles.item}>
                <div className={styles.itemTitle}>
                  {item.title || item.url || '未命名页面'}
                </div>
                {item.url && (
                  <div className={styles.itemUrl}>{item.url}</div>
                )}
                <div className={styles.itemMeta}>
                  {item.lastVisitTime
                    ? dayjs(item.lastVisitTime).format('YYYY-MM-DD HH:mm')
                    : '未知访问时间'}
                </div>
                {item.url && (
                  <div className={styles.action}>
                    <button
                      className={styles.button}
                      onClick={() => openItem(item.url)}
                    >
                      打开页面
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};
