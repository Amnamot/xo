// src/components/WaitModal.jsx v6.1
import React, { useEffect, useState } from 'react';
import './WaitModal.css';
import { lobbyService } from '../services/lobby';

const LOBBY_LIFETIME = 180; // время жизни лобби в секундах

const WaitModal = ({ onClose, creatorMarker }) => {
  const [secondsLeft, setSecondsLeft] = useState(LOBBY_LIFETIME);
  const [startTime, setStartTime] = useState(Date.now());
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();

  useEffect(() => {
    if (!telegramId) return;

    console.log('⏳ [WaitModal] Initializing wait state:', {
      telegramId,
      timestamp: new Date().toISOString()
    });

    // Подписываемся на события лобби
    lobbyService.subscribeToLobbyEvents(telegramId, {
      onGameStart: (data) => {
        console.log('📥 [WaitModal] Game started:', {
          data,
          telegramId,
          timestamp: new Date().toISOString()
        });
        onClose();
      },
      onUiState: (data) => {
        console.log('📥 [WaitModal] UI state updated:', {
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
      },
      onLobbyReady: (data) => {
        console.log('📥 [WaitModal] Lobby ready:', {
          data,
          telegramId,
          timestamp: new Date().toISOString()
        });
        if (data.creatorMarker) {
          setCreatorMarker(data.creatorMarker);
        }
      }
    });
    
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
        handleCancel();
      }
    }, 1000);

    return () => {
      console.log('🧹 [WaitModal] Cleaning up:', {
        telegramId,
        timestamp: new Date().toISOString()
      });
      clearInterval(timer);
      lobbyService.unsubscribeFromLobbyEvents();
    };
  }, [startTime, telegramId, onClose]);

  const handleCancel = async () => {
    if (!telegramId) {
      onClose();
      return;
    }

    try {
      await lobbyService.cancelLobby(telegramId);
      onClose();
    } catch (error) {
      console.error('❌ [WaitModal] Failed to cancel lobby:', {
        error: error.message,
        telegramId,
        timestamp: new Date().toISOString()
      });
      onClose();
      alert(error.message || "Failed to cancel lobby");
    }
  };

  const formatTime = (totalSeconds) => {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="waitFrame">
      <div className="waitText">We are waiting for\nthe zero to join</div>
      <div className="waitTimer">{formatTime(secondsLeft)}</div>
      <button className="waitButton" onClick={handleCancel}>Cancel</button>
    </div>
  );
};

export default WaitModal;
