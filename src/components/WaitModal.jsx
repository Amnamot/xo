// src/components/WaitModal.jsx v6.1
import React, { useEffect, useState } from 'react';
import './WaitModal.css';

const LOBBY_LIFETIME = 180; // время жизни лобби в секундах

const WaitModal = ({ onCancel }) => {
  const [secondsLeft, setSecondsLeft] = useState(LOBBY_LIFETIME);

  useEffect(() => {
    const startTime = Date.now();
    
    const timer = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, LOBBY_LIFETIME - elapsedSeconds);
      setSecondsLeft(remaining);

      // Если таймер дошел до нуля, отменяем лобби
      if (remaining === 0) {
        clearInterval(timer);
        onCancel();
      }
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
      <div className="waitText">We are waiting for\nthe zero to join</div>
      <div className="waitTimer">{formatTime(secondsLeft)}</div>
      <button className="waitButton" onClick={onCancel}>Cancel</button>
    </div>
  );
};

export default WaitModal;
