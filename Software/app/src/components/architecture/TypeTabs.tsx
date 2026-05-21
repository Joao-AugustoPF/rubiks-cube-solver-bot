"use client";

import { useState } from "react";
import styles from "./ArchitectureGuide.module.css";

export interface TypeTab {
  id: string;
  title: string;
  summary: string;
  code: string;
}

interface TypeTabsProps {
  tabs: TypeTab[];
}

export function TypeTabs({ tabs }: TypeTabsProps) {
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? "");
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  if (!activeTab) {
    return null;
  }

  return (
    <div className={styles.typeTabs}>
      <div className={styles.typeTabButtons}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.typeTabButton} ${
              tab.id === activeTab.id ? styles.typeTabButtonActive : ""
            }`}
            onClick={() => setActiveTabId(tab.id)}
          >
            {tab.title}
          </button>
        ))}
      </div>
      <div className={styles.typeTabPanel}>
        <p>{activeTab.summary}</p>
        <pre>
          <code>{activeTab.code}</code>
        </pre>
      </div>
    </div>
  );
}
