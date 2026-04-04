import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from './';

/**
 * Toast Notification Component
 * Auto-dismissing notification with Framer Motion slide-in animation
 */
const Toast = ({ message, onClose }) => {
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onClose();
    }, 3000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <motion.div
      onClick={onClose}
      className="fixed top-4 right-4 z-50 cursor-pointer"
      initial={{ x: '120%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '120%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
    >
      <div
        className="relative flex items-center px-4 py-3 rounded-lg shadow-lg"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-main)',
          boxShadow: '0 4px 12px rgba(255, 255, 255, 0.05)',
          minWidth: '200px'
        }}
      >
        <span style={{
          color: 'var(--text-main)',
          fontSize: '14px',
          fontFamily: 'Geist, sans-serif',
          marginRight: '24px'
        }}>
          {message}
        </span>
        <Button
          className="absolute top-2 right-2 hover:opacity-80 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          variant="secondary"
          size="small"
          style={{
            fontSize: '16px',
            lineHeight: '16px',
            padding: '4px',
            backgroundColor: 'transparent',
            border: 'none',
            height: 'auto'
          }}
          aria-label="Close notification"
        >
          ×
        </Button>
      </div>
    </motion.div>
  );
};

export default Toast;
