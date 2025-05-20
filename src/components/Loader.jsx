// src/components/Loader.jsx v5.1
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Loader.css';
import { initSocket, connectSocket, joinLobby, disconnectSocket } from '../services/socket';

const Loader = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [authorized, setAuthorized] = useState(false);
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
    }, 20);
    return () => clearInterval(interval);
  }, []);

  // Эффект для авторизации
  useEffect(() => {
    const initDataRaw = window.Telegram?.WebApp?.initData;
    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();

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
      
      // Подключаем сокет и логируем состояние для мок-режима
      const connectAndLog = async () => {
        try {
          await connectSocket();
          const socket = initSocket();
          socket.emit('uiState', { 
            state: 'loader', 
            telegramId: mockUser.telegramId,
            details: { progress: 0 }
          });
          setAuthorized(true);
        } catch (err) {
          console.error("Socket connection error in mock mode:", err);
          setError("Failed to connect to game server");
        }
      };
      
      connectAndLog();
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
      .then(async (user) => {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser?.photo_url) {
          user.avatar = tgUser.photo_url;
        }
        localStorage.setItem("user", JSON.stringify(user));
        
        // Подключаем сокет и логируем состояние после успешной авторизации
        try {
          await connectSocket();
          const socket = initSocket();
          socket.emit('uiState', { 
            state: 'loader', 
            telegramId: telegramId || user.telegramId,
            details: { progress: 0 }
          });
          setAuthorized(true);
        } catch (err) {
          console.error("Socket connection error:", err);
          setError("Failed to connect to game server");
          navigate("/nolobby", {
            state: {
              type: 'losst2',
              message: 'Failed to connect to game server.<br />Please try again.',
              redirectTo: '/start'
            }
          });
        }
      })
      .catch((err) => {
        console.error("Authorization error:", err);
        setError("Failed to authorize");
        navigate("/start");
      });
  }, [navigate]);

  // Эффект для обработки параметра start_param и перехода на нужный экран
  useEffect(() => {
    if (progress >= 100 && authorized) {
      const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
      const user = JSON.parse(localStorage.getItem('user') || '{}');

      if (startParam) {
        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) {
          console.warn("No initData during lobby join. Aborting.");
          navigate("/nolobby", { 
            state: { 
              type: 'losst2',
              message: 'Either the battle is over,<br />or the link is very old...',
              redirectTo: '/start'
            } 
          });
          return;
        }

        // Пытаемся присоединиться к лобби
        const connectAndJoin = async () => {
          try {
            console.log('🔄 Connecting to WebSocket and joining lobby:', startParam);
            const joinResponse = await joinLobby(startParam, telegramId || user.telegramId);
            
            if (joinResponse.status === 'error') {
              console.warn('❌ Error joining lobby:', joinResponse);
              
              // Отключаем сокет при ошибке
              disconnectSocket();
              
              if (joinResponse.errorType === 'expired') {
                navigate("/nolobby", {
                  state: {
                    type: 'losst2',
                    message: joinResponse.message || 'The game session has expired.',
                    redirectTo: '/start'
                  }
                });
              } else if (joinResponse.errorType === 'disconnected') {
                navigate("/nolobby", {
                  state: {
                    type: 'losst2',
                    message: joinResponse.message || 'Waiting for the opponent to reconnect...',
                    timer: joinResponse.ttl,
                    redirectTo: '/start'
                  }
                });
              } else {
                navigate("/nolobby", {
                  state: {
                    type: 'losst2',
                    message: joinResponse.message || 'Failed to join the game.',
                    redirectTo: '/start'
                  }
                });
              }
              return;
            }

            console.log('✅ Successfully joined lobby:', joinResponse);
            // Если всё успешно, переходим на страницу игры
            navigate(`/game/${startParam}`, { replace: true });
          } catch (error) {
            console.error("❌ Failed to join lobby:", error);
            
            // Отключаем сокет при ошибке
            disconnectSocket();
            
            navigate("/nolobby", {
              state: {
                type: 'losst2',
                message: 'Failed to join the game.<br />Please try again.',
                redirectTo: '/start'
              }
            });
          }
        };

        // Ждем полной загрузки UI перед подключением к лобби
        setTimeout(() => {
          connectAndJoin();
        }, 500);
      } else {
        // Проверяем, есть ли активное лобби для этого пользователя
        const socket = initSocket();
        
        if (telegramId || user.telegramId) {
          socket.emit('checkActiveLobby', { telegramId: telegramId || user.telegramId }, (response) => {
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
