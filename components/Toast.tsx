import React, { useState, useEffect } from 'react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Animate in
    setShow(true);

    // Set timers to animate out and then dismiss
    const fadeOutTimer = setTimeout(() => {
      setShow(false);
    }, 2500); // Start fading out after 2.5s

    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, 3000); // Fully dismiss after 3s (allowing for 0.5s fade-out)

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(dismissTimer);
    };
  }, [message, onDismiss]);

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 bg-dark-surface-light text-white font-semibold py-3 px-6 rounded-full shadow-lg transition-all duration-500 transform
        ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}
      `}
    >
      {message}
    </div>
  );
};
