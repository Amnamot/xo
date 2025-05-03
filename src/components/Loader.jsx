// Loader.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Loader.css';

const Loader = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [authorized, setAuthorized] = useState(false);

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

  useEffect(() => {
    let initDataRaw = window.Telegram?.WebApp?.initData;

    // ✅ Логируем initData для отладки
    console.log("🧪 RAW initData:", initDataRaw);
    console.log("🧪 Parsed initDataUnsafe:", window.Telegram?.WebApp?.initDataUnsafe);

    // ✅ фильтруем signature, если есть
    if (initDataRaw) {
      const params = new URLSearchParams(initDataRaw);
      params.delete('signature');
      initDataRaw = params.toString();
      localStorage.setItem("initData", initDataRaw);
    }

    if (!initDataRaw) {
      console.warn("initData is missing, using mock");
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
      });
  }, []);

  useEffect(() => {
    if (progress >= 100 && authorized) {
      navigate('/start');
    }
  }, [progress, authorized, navigate]);

  return (
    <div className="loader">
      <div className="loader-bar">
        <div className="loader-progress" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="loader-version">v1.0.2</div>
    </div>
  );
};

export default Loader;
