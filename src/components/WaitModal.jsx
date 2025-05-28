// src/components/WaitModal.jsx v6.1
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './WaitModal.css';
import { gameService } from '../services/game';

const WaitModal = ({ onCancel, lobbyId, telegramId }) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const navigate = useNavigate();

  const handleCancel = async () => {
    try {
      console.log('🎮 [Game] Cancelling lobby:', {
        telegramId,
        lobbyId,
        timestamp: new Date().toISOString()
      });
      
      await gameService.cancelLobby(telegramId);
      navigate('/');
    } catch (error) {
      console.error('❌ [Game] Error cancelling lobby:', error);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleCancel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [handleCancel]); // Добавляем handleCancel в зависимости

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
