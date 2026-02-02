'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './ActionsMenu.module.css';

interface ActionsMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

export default function ActionsMenu({ onEdit, onDelete }: ActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={styles.container} ref={menuRef}>
      <button
        className={styles.menuButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Actions menu"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="10" cy="5" r="1.5" fill="currentColor" />
          <circle cx="10" cy="10" r="1.5" fill="currentColor" />
          <circle cx="10" cy="15" r="1.5" fill="currentColor" />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.menu}>
          <button
            className={styles.menuItem}
            onClick={() => {
              onEdit();
              setIsOpen(false);
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11.333 2a2.667 2.667 0 0 1 3.771 3.771l-8 8a2.667 2.667 0 0 1-1.885.78H4v-1.219a2.667 2.667 0 0 1 .78-1.885l8-8zm2.219 1.448a1.333 1.333 0 0 0-1.885-1.885l-.943.943 1.885 1.885.943-.943z"
                fill="currentColor"
              />
            </svg>
            Edit
          </button>
          <button
            className={`${styles.menuItem} ${styles.deleteItem}`}
            onClick={() => {
              onDelete();
              setIsOpen(false);
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 2a1 1 0 0 0-1 1v1H3a.5.5 0 0 0 0 1h.914l.846 7.384A2 2 0 0 0 7.354 14h1.292a2 2 0 0 0 1.594-1.616L11.086 5H12a.5.5 0 0 0 0-1h-2V3a1 1 0 0 0-1-1H6zm.5 2h3v1h-3V4zm0 2h3v1h-3V6zm0 2h3v1h-3V8z"
                fill="currentColor"
              />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}


