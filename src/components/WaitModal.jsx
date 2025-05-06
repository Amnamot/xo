// src/components/WaitModal.jsx v1
import React, { useEffect, useState } from 'react';
import './WaitModal.css';

const WaitModal = ({ onCancel }) => {
  const [secondsLeft, setSecondsLeft] = useState(180);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onCancel(); // Автоматическая отмена
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onCancel]);

  const formatTime = (totalSeconds) => {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="waitFrame">
      <div className="waitText">Ожидаем присоединения противника</div>
      <div className="waitTimer">{formatTime(secondsLeft)}</div>
      <button className="waitButton" onClick={onCancel}>Cancel</button>
    </div>
  );
};

export default WaitModal;
