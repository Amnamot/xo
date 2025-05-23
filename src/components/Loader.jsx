// src/components/Loader.jsx v5.2
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Loader.css';
import { joinLobby, socket } from '../services/socket';

const Loader = () => {
  const navigate = useNavigate();
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

  // Эффект для проверки готовности к переходу
  useEffect(() => {
    if (progress >= 100 && isActionsComplete) {
      setIsLoading(false);
    }
  }, [progress, isActionsComplete]);

  // Функция инициализации
  const handleInitialization = async () => {
    try {
      const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
      const telegramId = localStorage.getItem('current_telegram_id');
      
      console.log('🔄 [Loader] Starting initialization:', {
        startParam,
        telegramId,
        timestamp: new Date().toISOString()
      });

      // 1. Проверка startParam
      if (!startParam) {
        console.log('🏠 [Loader] No start_param, navigating to start screen:', {
          telegramId,
          timestamp: new Date().toISOString()
        });
        navigate("/start", { replace: true });
        return;
      }

      const initData = window.Telegram?.WebApp?.initData;
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      
      console.log('🔍 [Loader] Checking initData:', {
        hasInitData: !!initData,
        startParam,
        telegramId,
        hasTgUser: !!tgUser,
        timestamp: new Date().toISOString()
      });

      // 2. Проверка initData
      if (!initData) {
        console.warn("❌ [Loader] No initData. Aborting.", {
          startParam,
          telegramId,
          timestamp: new Date().toISOString()
        });
        navigate("/nolobby", { 
          state: { 
            type: 'losst2',
            message: 'Either the battle is over,<br />or the link is very old...',
            redirectTo: '/start'
          } 
        });
        return;
      }

      // 3. Проверка telegramId
      if (!telegramId) {
        console.error('❌ [Loader] Missing telegramId:', {
          startParam,
          hasInitData: !!initData,
          hasTgUser: !!tgUser,
          timestamp: new Date().toISOString()
        });
        navigate("/nolobby", { 
          state: { 
            type: 'losst2',
            message: 'Failed to validate user data.<br />Please try again.',
            redirectTo: '/start'
          } 
        });
        return;
      }

      // 4. Проверка соответствия telegramId
      const tgUserId = tgUser?.id?.toString();
      if (tgUserId && tgUserId !== telegramId) {
        console.error('❌ [Loader] Telegram ID mismatch:', {
          storedTelegramId: telegramId,
          currentTgUserId: tgUserId,
          startParam,
          timestamp: new Date().toISOString()
        });
        navigate("/nolobby", { 
          state: { 
            type: 'losst2',
            message: 'User data mismatch.<br />Please try again.',
            redirectTo: '/start'
          } 
        });
        return;
      }

      // 5. Присоединение к лобби
      console.log('✅ [Loader] All checks passed, joining lobby:', {
        gameId: startParam,
        telegramId,
        timestamp: new Date().toISOString()
      });

      await joinLobby(socket, startParam, telegramId);
      
      console.log('✅ [Loader] Successfully joined lobby:', {
        gameId: startParam,
        telegramId,
        timestamp: new Date().toISOString()
      });

      setIsActionsComplete(true);
    } catch (error) {
      console.error('❌ [Loader] Initialization failed:', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      navigate("/nolobby", { 
        state: { 
          type: 'losst2',
          message: 'Failed to join the game.<br />Please try again.',
          redirectTo: '/start'
        } 
      });
    }
  };

  // Запускаем инициализацию при монтировании
  useEffect(() => {
    handleInitialization();
  }, []);

  // Эффект для навигации после завершения всех действий
  useEffect(() => {
    if (!isLoading) {
      const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
      if (startParam) {
        navigate(`/game/${startParam}`, { replace: true });
      }
    }
  }, [isLoading, navigate]);

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
