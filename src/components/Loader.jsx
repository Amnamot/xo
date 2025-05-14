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

        fetch("https://api.igra.top/lobby/join", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-init-data": initData
          },
          body: JSON.stringify({ lobbyId })
        })
          .then((res) => {
            localStorage.removeItem("lobbyIdToJoin");
            if (res.ok) {
              return res.json().then((data) => {
                if (data.status === 'error') {
                  if (data.errorType === 'disconnected') {
                    navigate("/loss", { 
                      state: { 
                        type: 'losst2',
                        message: data.message,
                        timer: data.ttl,
                        redirectTo: '/start'
                      } 
                    });
                  } else if (data.errorType === 'expired') {
                    navigate("/loss", { 
                      state: { 
                        type: 'losst2',
                        message: data.message,
                        redirectTo: '/start'
                      } 
                    });
                  }
                  return;
                }
                
                if (data.status === 'creator') {
                  fetch("https://api.igra.top/lobby/timeleft", {
                    headers: {
                      "x-init-data": initData
                    }
                  })
                    .then((res) => res.ok ? res.json() : null)
                    .then((data) => {
                      if (data?.timeLeft != null) {
                        localStorage.setItem("timeLeft", data.timeLeft);
                      }
                    })
                    .catch((e) => console.warn("❌ Failed to preload timeLeft:", e));

                  localStorage.setItem("showWaitModal", "true");
                  navigate("/start");
                } else {
                  console.log("✅ Lobby join successful");
                  navigate("/game");
                }
              });
            } else {
              navigate("/loss", { 
                state: { 
                  type: 'losst2',
                  message: 'Either the battle is over,<br />or the link is very old...',
                  redirectTo: '/start'
                } 
              });
            }
          })
          .catch((err) => {
            console.warn("🔥 Fetch error during lobby join:", err);
            localStorage.removeItem("lobbyIdToJoin");
            navigate("/loss", { 
              state: { 
                type: 'losst2',
                message: 'Either the battle is over,<br />or the link is very old...',
                redirectTo: '/start'
              } 
            });
          });
      } else {
        navigate("/start");
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
