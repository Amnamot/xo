// src/components/WaitModal.jsx v6.2
import React, { useEffect, useState } from 'react';
import './WaitModal.css';
import { initSocket, getSocket } from '../services/socket';

const LOBBY_LIFETIME = 180; // время жизни лобби в секундах

const WaitModal = ({ onCancel, isOpen }) => {
  const [secondsLeft, setSecondsLeft] = useState(LOBBY_LIFETIME);
  const [startTime, setStartTime] = useState(Date.now());
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
  const [waitMessage, setWaitMessage] = useState('Waiting for opponent...');
  const [error, setError] = useState(null);

  const startTimer = (ttl) => {
    setSecondsLeft(ttl);
    setStartTime(Date.now());
  };

  useEffect(() => {
    let socket = null;
    let timer = null;

    const initialize = async () => {
      try {
        // Инициализируем сокет с гарантированным подключением
        socket = await initSocket();

        // Отправляем начальное состояние
        if (telegramId) {
          socket.emit('uiState', { 
            state: 'waitModal', 
            telegramId,
            details: { timeLeft: LOBBY_LIFETIME }
          });
        }

        // Слушаем событие uiState для восстановления таймера
        socket.on('uiState', (data) => {
          if (data.state === 'waitModal' && data.details?.isReconnect) {
            const timeLeft = data.details.timeLeft;
            setSecondsLeft(timeLeft);
            setStartTime(Date.now() - ((LOBBY_LIFETIME - timeLeft) * 1000));
          }
        });

        // Запускаем таймер
        timer = setInterval(() => {
          const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
          const remaining = Math.max(0, LOBBY_LIFETIME - elapsedSeconds);
          setSecondsLeft(remaining);

          // Если таймер дошел до нуля, отменяем лобби
          if (remaining === 0) {
            clearInterval(timer);
            console.log('⏰ Lobby timeout, cancelling...', {
              telegramId,
              timestamp: new Date().toISOString()
            });
            onCancel();
          }
        }, 1000);

      } catch (error) {
        console.error('❌ Error initializing WaitModal:', error);
        setError(error.message);
      }
    };

    if (isOpen) {
      initialize();
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
      if (socket) {
        socket.off('uiState');
      }
    };
  }, [isOpen, telegramId, startTime, onCancel]);

  if (error) {
    return (
      <div className="wait-modal">
        <div className="wait-modal-content">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={onCancel}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wait-modal">
      <div className="wait-modal-content">
        <h2>{waitMessage}</h2>
        <p>Time left: {secondsLeft} seconds</p>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

export default WaitModal;
