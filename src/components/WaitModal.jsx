// src/components/WaitModal.jsx v6.1
import React, { useEffect, useState } from 'react';
import './WaitModal.css';
import { initSocket } from '../services/socket';

const LOBBY_LIFETIME = 180; // время жизни лобби в секундах

const WaitModal = ({ onCancel }) => {
  const [secondsLeft, setSecondsLeft] = useState(LOBBY_LIFETIME);
  const [startTime, setStartTime] = useState(Date.now());
  const [creatorMarker, setCreatorMarker] = useState('');
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();

  useEffect(() => {
    console.log('🔄 [WaitModal] Component mounted');
    const socket = initSocket();

    // Отправляем начальное состояние
    if (telegramId) {
      socket.emit('uiState', { 
        state: 'waitModal', 
        telegramId,
        details: { timeLeft: LOBBY_LIFETIME }
      });
    }

    // Слушаем событие setShowWaitModal для получения маркера
    socket.on('setShowWaitModal', (data) => {
      console.log('👑 [WaitModal] Received setShowWaitModal:', {
        data,
        hasMarker: !!data.creatorMarker,
        marker: data.creatorMarker,
        timestamp: new Date().toISOString()
      });
      
      if (data.creatorMarker) {
        setCreatorMarker(data.creatorMarker);
      }
    });

    // Слушаем событие lobbyReady для получения маркера
    socket.on('lobbyReady', (data) => {
      console.log('👑 [WaitModal] Received lobbyReady:', {
        data,
        hasMarker: !!data.creatorMarker,
        marker: data.creatorMarker,
        timestamp: new Date().toISOString()
      });
      
      if (data.creatorMarker) {
        setCreatorMarker(data.creatorMarker);
      }
    });

    // Слушаем событие uiState для восстановления таймера
    socket.on('uiState', (data) => {
      if (data.state === 'waitModal' && data.details?.isReconnect) {
        const timeLeft = data.details.timeLeft;
        setSecondsLeft(timeLeft);
        setStartTime(Date.now() - ((LOBBY_LIFETIME - timeLeft) * 1000));
      }
    });
    
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

    return () => {
      console.log('🔄 [WaitModal] Component unmounting');
      clearInterval(timer);
      socket.off('uiState');
      socket.off('setShowWaitModal');
      socket.off('lobbyReady');
    };
  }, [onCancel, startTime, telegramId]);

  const formatTime = (totalSeconds) => {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="waitFrame">
      <div className="waitText">
        We are waiting for<br />the zero to join 1<br />
        {creatorMarker && <span className="creatorMarker">{creatorMarker}</span>}
      </div>
      <div className="waitTimer">{formatTime(secondsLeft)}</div>
      <button className="waitButton" onClick={onCancel}>Cancel</button>
    </div>
  );
};

export default WaitModal;
