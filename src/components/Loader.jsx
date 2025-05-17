// src/components/Loader.jsx v5.1
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Loader.css';
import { joinLobby } from '../services/socket';

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
        avatar: "../media/buddha.svg",
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
      .then(async (user) => {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser?.photo_url) {
          user.avatar = tgUser.photo_url;
        }
        localStorage.setItem("user", JSON.stringify(user));
        setAuthorized(true);
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

        // Переходим на страницу игры с параметром лобби
        navigate(`/game/${startParam}`, { replace: true });
      } else {
        // Если нет start_param, переходим на стартовый экран
        navigate("/start", { replace: true });
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
