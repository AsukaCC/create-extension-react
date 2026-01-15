import React, { useEffect, useMemo, useState } from 'react';
import styles from './index.module.css';

type FlatBookmark = {
  id: string;
  title: string;
  url?: string;
  depth: number;
  isFolder: boolean;
};

export const BookmarksContent: React.FC = () => {
  const [items, setItems] = useState<FlatBookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.bookmarks.getTree((tree) => {
      const rootChildren = tree[0]?.children ?? [];
      const flat: FlatBookmark[] = [];

      const walk = (nodes: chrome.bookmarks.BookmarkTreeNode[], depth: number) => {
        nodes.forEach((node) => {
          const isFolder = !node.url;
          flat.push({
            id: node.id,
            title: node.title || (isFolder ? '未命名文件夹' : '未命名书签'),
            url: node.url,
            depth,
            isFolder,
          });
          if (node.children && node.children.length > 0) {
            walk(node.children, depth + 1);
          }
        });
      };

      walk(rootChildren, 0);
      setItems(flat);
      setLoading(false);
    });
  }, []);

  const summary = useMemo(() => {
    if (loading) {
      return '正在读取书签...';
    }
    if (items.length === 0) {
      return '暂无书签数据。';
    }
    return `当前共读取 ${items.length} 条书签与文件夹。`;
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
        <h2 className={styles.title}>书签概览</h2>
        <p className={styles.summary}>{summary}</p>
        {loading ? (
          <div className={styles.loading}>加载中...</div>
        ) : (
          <div className={styles.list}>
            {items.map((item) => (
              <div
                key={item.id}
                className={styles.item}
                style={{ marginLeft: item.depth * 12 }}
              >
                {item.isFolder ? (
                  <div className={styles.folder}>📁 {item.title}</div>
                ) : (
                  <>
                    <div className={styles.itemTitle}>{item.title}</div>
                    {item.url && (
                      <div className={styles.itemUrl}>{item.url}</div>
                    )}
                  </>
                )}
                {!item.isFolder && item.url && (
                  <button
                    className={styles.button}
                    onClick={() => openItem(item.url)}
                  >
                    打开书签
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};
