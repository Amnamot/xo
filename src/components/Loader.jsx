// src/components/Loader.jsx v5.1
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Loader.css';
import { initSocket, connectSocket } from '../services/socket';

const Loader = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Подключаем сокет и логируем показ лоадера
    const logLoaderState = async () => {
      await connectSocket();
      const socket = initSocket();
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      socket.emit('uiState', { 
        state: 'loader', 
        telegramId: user.telegramId || 'unknown',
        details: { progress: 0 }
      });
    };
    
    logLoaderState();
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 20);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const initDataRaw = window.Telegram?.WebApp?.initData;
    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;

    if (startParam) {
      localStorage.setItem("lobbyIdToJoin", startParam);
    }

    console.log("🧪 RAW initData:", initDataRaw);
    console.log("🧪 Parsed initDataUnsafe:", window.Telegram?.WebApp?.initDataUnsafe);

    if (!initDataRaw) {
      console.warn("initData is missing or invalid. Running mock mode.");
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
      setAuthorized(true);
      return;
    }

    fetch("https://api.igra.top/user/init", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ initData: initDataRaw })
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to authorize");
        return res.json();
      })
      .then((user) => {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser?.photo_url) {
          user.avatar = tgUser.photo_url;
        }
        localStorage.setItem("user", JSON.stringify(user));
        setAuthorized(true);
      })
      .catch((err) => {
        console.error("Authorization error:", err);
        navigate("/start");
      });
  }, [navigate]);

  useEffect(() => {
    if (progress >= 100 && authorized) {
      const lobbyId = localStorage.getItem("lobbyIdToJoin");

      if (lobbyId) {
        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) {
          console.warn("No initData during lobby join. Aborting.");
          localStorage.removeItem("lobbyIdToJoin");
          navigate("/loss", { 
            state: { 
              type: 'losst2',
              message: 'Either the battle is over,<br />or the link is very old...',
              redirectTo: '/start'
            } 
          });
          return;
        }

        // Переходим на страницу игры с lobbyId
        navigate(`/game/${lobbyId}`, { replace: true });
        localStorage.removeItem("lobbyIdToJoin"); // Очищаем после использования
      } else {
        // Проверяем, есть ли активное лобби для этого пользователя
        const socket = initSocket();
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (user.telegramId) {
          socket.emit('checkActiveLobby', { telegramId: user.telegramId }, (response) => {
            if (response?.lobbyId) {
              // Если есть активное лобби, устанавливаем флаг для показа WaitModal
              localStorage.setItem('showWaitModal', 'true');
              localStorage.setItem('lobbyTTL', response.ttl.toString());
            }
            // В любом случае переходим на стартовый экран
            navigate("/start", { replace: true });
          });
        } else {
          navigate("/start", { replace: true });
        }
      }
    }
  }, [progress, authorized, navigate]);

  return (
    <div className="loader">
      <div className="loader-bar">
        <div className="loader-progress" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="loader-version">Created with symbiotic intelligence.</div>
    </div>
  );
};

export default Loader;
