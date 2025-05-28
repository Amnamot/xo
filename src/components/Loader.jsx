// src/components/Loader.jsx v5.3
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Loader.css';
import { joinLobby } from '../services/socket';
import { useSocket } from '../contexts/SocketContext';

const Loader = () => {
  const navigate = useNavigate();
  const socketContext = useSocket();
  const [progress, setProgress] = useState(0);
  const [isActionsComplete, setIsActionsComplete] = useState(false);
  const [error, setError] = useState(null);

  // Функция проверки состояния лобби
  const checkLobbyState = async (lobbyId) => {
    try {
      console.log('🔍 [Loader] Checking lobby state:', {
        lobbyId,
        timestamp: new Date().toISOString()
      });

      const response = await fetch(`/lobby/state/${lobbyId}`);
      if (!response.ok) {
        throw new Error(`Failed to check lobby state: ${response.status}`);
      }

      const state = await response.json();
      console.log('✅ [Loader] Lobby state received:', {
        lobbyId,
        state,
        timestamp: new Date().toISOString()
      });

      return {
        isValid: true,
        state
      };
    } catch (error) {
      console.error('❌ [Loader] Lobby state check failed:', {
        lobbyId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return {
        isValid: false,
        error: error.message
      };
    }
  };

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
        // Проверяем инициализацию Telegram WebApp
        if (!window.Telegram?.WebApp) {
          console.error('❌ [Loader] Telegram WebApp not initialized');
          navigate("/start", { replace: true });
          return;
        }

        // Логируем start_param в начале инициализации
        const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
        console.log('🎯 [Loader] Initial start_param check:', {
          startParam,
          hasWebApp: Boolean(window.Telegram?.WebApp),
          hasInitDataUnsafe: Boolean(window.Telegram?.WebApp?.initDataUnsafe),
          timestamp: new Date().toISOString()
        });

        const initData = window.Telegram?.WebApp?.initData;
        const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();

        if (!initData || !telegramId) {
          console.error('❌ [Loader] Missing initData or telegramId');
          navigate("/start", { replace: true });
          return;
        }

        console.log('🔄 [Loader] Starting initialization:', {
          telegramId,
          timestamp: new Date().toISOString()
        });

        // 1. Инициализация пользователя через /user/init
        console.log('📤 [Loader] Sending request to /user/init:', {
          url: 'https://api.igra.top/user/init',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-init-data': initData
          },
          body: { initData },
          timestamp: new Date().toISOString()
        });

        const response = await fetch('https://api.igra.top/user/init', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-init-data': initData
          },
          body: JSON.stringify({ initData })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ [Loader] User initialized:', {
          response: data,
          timestamp: new Date().toISOString()
        });

        // Инициализируем сокет в любом случае
        socketContext.initSocket(telegramId);
        console.log('🔌 [Loader] Socket initialized:', {
          telegramId,
          timestamp: new Date().toISOString()
        });

        if (data.lobbyId) {
          // Проверяем состояние лобби перед присоединением
          const lobbyState = await checkLobbyState(data.lobbyId);
          
          if (!lobbyState.isValid) {
            throw new Error(lobbyState.error || 'Invalid lobby state');
          }

          // Присоединяемся к лобби
          await joinLobby(socketContext.socket, data.lobbyId, telegramId);
          console.log('✅ [Loader] Joined lobby:', {
            lobbyId: data.lobbyId,
            telegramId,
            timestamp: new Date().toISOString()
          });
        }

        setIsActionsComplete(true);
      } catch (error) {
        console.error('❌ [Loader] Initialization error:', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        setError(error.message);
      }
    };

    initializeUser();
  }, [navigate, socketContext]);

  // Эффект для проверки готовности к переходу
  useEffect(() => {
    if (progress >= 100 && isActionsComplete) {
      const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
      console.log('🎯 [Loader] Checking start_param:', {
        startParam,
        progress,
        isActionsComplete,
        timestamp: new Date().toISOString()
      });
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
