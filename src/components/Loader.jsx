// src/components/Loader.jsx v5.2
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Loader.css';
import { joinLobby } from '../services/socket';
import { useSocket } from '../contexts/SocketContext';

const Loader = () => {
  const navigate = useNavigate();
  const socketContext = useSocket();
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionsComplete, setIsActionsComplete] = useState(false);
  const [error, setError] = useState(null);

  // Эффект для прогресс-бара
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 15); // 1500мс / 100 шагов
    return () => clearInterval(interval);
  }, []);

  // Эффект для инициализации и проверки лобби
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const initData = window.Telegram?.WebApp?.initData;
        const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();

        if (!initData || !telegramId) {
          console.error('❌ [Loader] Missing initData or telegramId');
          navigate("/start", { replace: true });
          return;
        }

        console.log('🔄 [Loader] Initializing user:', {
          telegramId,
          timestamp: new Date().toISOString()
        });

        const response = await fetch('https://api.igra.top/user/init', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ initData })
        });

        const data = await response.json();
        console.log('✅ [Loader] User initialized:', {
          response: data,
          timestamp: new Date().toISOString()
        });

        if (data.lobbyId) {
          // Если найдено лобби - присоединяемся
          socketContext.initSocket(telegramId);
          await joinLobby(socketContext.socket, data.lobbyId, telegramId);
          setIsActionsComplete(true);
        } else {
          // Если лобби не найдено - идем на стартовый экран
          setIsActionsComplete(true);
        }
      } catch (error) {
        console.error('❌ [Loader] Initialization error:', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        setError(error.message);
      }
    };

    initializeUser();
  }, []);

  // Эффект для проверки готовности к переходу
  useEffect(() => {
    if (progress >= 100 && isActionsComplete) {
      setIsLoading(false);
      const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
      if (startParam) {
        navigate(`/game/${startParam}`, { replace: true });
      } else {
        navigate("/start", { replace: true });
      }
    }
  }, [progress, isActionsComplete, navigate]);

  if (error) {
    return (
      <div className="loader">
        <div className="loader-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="loader">
      <div className="loader-bar">
        <div className="loader-progress" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="loader-version">Created with symbiotic intelligence</div>
    </div>
  );
};

export default Loader;
