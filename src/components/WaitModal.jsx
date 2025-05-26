// src/components/WaitModal.jsx v6.1
import React, { useEffect, useState } from 'react';
import './WaitModal.css';
import { useSocket } from '../contexts/SocketContext';
import { lobbyService } from '../services/lobby';

const WaitModal = ({ onClose, telegramId }) => {
  const { socket } = useSocket();
  const [timeLeft, setTimeLeft] = useState(180);

  useEffect(() => {
    if (!socket || !telegramId) return;

    let timer;

    // Подписываемся на события лобби
    lobbyService.subscribeToLobbyEvents(socket, telegramId, {
      onGameStart: () => {
        console.log('🎮 [WaitModal] Game started');
        onClose();
      },
      onUiState: (data) => {
        console.log('📱 [WaitModal] UI state updated:', data);
        if (data.details?.timeLeft) {
          setTimeLeft(data.details.timeLeft);
        }
      },
      onLobbyReady: () => {
        console.log('✅ [WaitModal] Lobby ready');
      }
    });

    // Запускаем таймер
    timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleCancel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timer) clearInterval(timer);
      lobbyService.unsubscribeFromLobbyEvents(socket);
    };
  }, [socket, telegramId, onClose]);

  const handleCancel = async () => {
    if (!socket || !telegramId) return;
    
    try {
      await lobbyService.cancelLobby(socket, telegramId);
      onClose();
    } catch (error) {
      console.error('❌ [WaitModal] Error cancelling lobby:', error);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="waitFrame">
      <div className="waitText">We are waiting for<br />the zero to join</div>
      <div className="waitTimer">{formatTime(timeLeft)}</div>
      <button className="waitButton" onClick={handleCancel}>Cancel</button>
    </div>
  );
};

export default WaitModal;
