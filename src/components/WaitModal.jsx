// src/components/WaitModal.jsx v6.1
import React, { useEffect, useState } from 'react';
import './WaitModal.css';

const LOBBY_LIFETIME = 180; // время жизни лобби в секундах

const WaitModal = ({ onCancel, creatorMarker }) => {
  const [secondsLeft, setSecondsLeft] = useState(LOBBY_LIFETIME);
  const [startTime, setStartTime] = useState(Date.now());

  useEffect(() => {
    console.log('🔄 [WaitModal] Component mounted');
    
    const timer = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, LOBBY_LIFETIME - elapsedSeconds);
      setSecondsLeft(remaining);

      if (remaining === 0) {
        clearInterval(timer);
        onCancel();
      }
    }, 1000);

    return () => {
      console.log('🔄 [WaitModal] Component unmounting');
      clearInterval(timer);
    };
  }, [onCancel, startTime]);

  const formatTime = (totalSeconds) => {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="waitFrame">
      <div className="waitText">
        We are waiting for<br />
        the {creatorMarker && <span className="creatorMarker">{creatorMarker}</span>}  to join
      </div>
      <div className="waitTimer">{formatTime(secondsLeft)}</div>
      <button className="waitButton" onClick={onCancel}>Cancel</button>
    </div>
  );
};

export default WaitModal;
