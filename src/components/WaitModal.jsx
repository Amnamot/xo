// src/components/WaitModal.jsx v6.1
import React, { useEffect, useState } from 'react';
import './WaitModal.css';
import { useSocket } from '../context/SocketContext';

const LOBBY_LIFETIME = 180; // время жизни лобби в секундах

const WaitModal = ({ onCancel }) => {
  const [secondsLeft, setSecondsLeft] = useState(LOBBY_LIFETIME);
  const [startTime, setStartTime] = useState(Date.now());
  const socket = useSocket();
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();

  useEffect(() => {
    if (!socket) return;

    console.log('⏳ [WaitModal] Initializing wait state:', {
      telegramId,
      socketId: socket.id,
      connected: socket.connected,
      rooms: Array.from(socket.rooms || []),
      timestamp: new Date().toISOString()
    });

    // Отправляем начальное состояние
    if (telegramId) {
      socket.emit('uiState', { 
        state: 'waitModal', 
        telegramId,
        details: { timeLeft: LOBBY_LIFETIME }
      });
      
      console.log('📤 [WaitModal] Sent initial UI state:', {
        telegramId,
        timeLeft: LOBBY_LIFETIME,
        timestamp: new Date().toISOString()
      });
    }

    // Слушаем событие uiState для восстановления таймера
    const handleUiState = (data) => {
      console.log('📥 [WaitModal] Received UI state update:', {
        data,
        telegramId,
        timestamp: new Date().toISOString()
      });
      
      if (data.state === 'waitModal' && data.details?.isReconnect) {
        const timeLeft = data.details.timeLeft;
        setSecondsLeft(timeLeft);
        setStartTime(Date.now() - ((LOBBY_LIFETIME - timeLeft) * 1000));
        
        console.log('🔄 [WaitModal] Restored timer state:', {
          timeLeft,
          startTime: Date.now() - ((LOBBY_LIFETIME - timeLeft) * 1000),
          timestamp: new Date().toISOString()
        });
      }
    };
    socket.on('uiState', handleUiState);
    
    const timer = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, LOBBY_LIFETIME - elapsedSeconds);
      setSecondsLeft(remaining);

      // Если таймер дошел до нуля, отменяем лобби
      if (remaining === 0) {
        console.log('⏰ [WaitModal] Timer expired:', {
          telegramId,
          timestamp: new Date().toISOString()
        });
        clearInterval(timer);
        onCancel();
      }
    }, 1000);

    return () => {
      console.log('🧹 [WaitModal] Cleaning up:', {
        telegramId,
        timestamp: new Date().toISOString()
      });
      clearInterval(timer);
      socket.off('uiState', handleUiState);
    };
  }, [onCancel, startTime, telegramId, socket]);

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
