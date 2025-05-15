// src/components/Loader.jsx v5.2
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Loader.css';

const Loader = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const startTime = Date.now();
    let progressInterval;

    const initializeApp = async () => {
      try {
        const initDataRaw = window.Telegram?.WebApp?.initData;
        const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
        const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
        
        // Все асинхронные операции выполняются параллельно
        const [authResponse, lobbyCheck] = await Promise.all([
          // Авторизация пользователя
          initDataRaw ? fetch("https://api.igra.top/user/init", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: initDataRaw })
          }) : Promise.resolve(null),
          
          // Проверка лобби через HTTP
          telegramId ? fetch(`https://api.igra.top/lobby/check/${telegramId}`) : Promise.resolve(null)
        ]);

        // Обработка результатов авторизации
        if (authResponse) {
          const user = await authResponse.json();
          const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
          if (tgUser?.photo_url) {
            user.avatar = tgUser.photo_url;
          }
          localStorage.setItem("user", JSON.stringify(user));
        } else {
          // Мок для разработки
          const mockUser = {
            telegramId: "local-id",
            userName: "devuser",
            firstName: "Developer",
            lastName: "Mode",
            avatar: "/media/buddha.svg",
            numGames: 12,
            numWins: 4,
            stars: 10
          };
          localStorage.setItem('user', JSON.stringify(mockUser));
        }

        // Обработка результатов проверки лобби
        if (lobbyCheck) {
          const lobbyData = await lobbyCheck.json();
          if (lobbyData?.lobbyId) {
            localStorage.setItem('showWaitModal', 'true');
            localStorage.setItem('lobbyTTL', lobbyData.ttl.toString());
            localStorage.setItem('lobbyStatus', lobbyData.status);
          }
        }

        // Ждем минимум 2 секунды
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 2000 - elapsedTime);
        
        await new Promise(resolve => setTimeout(resolve, remainingTime));
        clearInterval(progressInterval);
        setProgress(100);

        // Определяем маршрут на основе результатов
        if (startParam) {
          // Если есть start_param, переходим в игру
          navigate(`/game/${startParam}`, { replace: true });
        } else {
          // Обычный переход на старт
          navigate("/start", { replace: true });
        }

      } catch (err) {
        console.error("Initialization error:", err);
        setError("Failed to initialize application");
        clearInterval(progressInterval);
      }
    };

    // Запускаем прогресс-бар
    progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 20);

    // Запускаем инициализацию
    initializeApp();

    return () => clearInterval(progressInterval);
  }, [navigate]);

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
