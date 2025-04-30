// Loader.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Loader.css';

const Loader = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

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
    const initData = window.Telegram?.WebApp?.initDataUnsafe;
    if (initData?.user) {
      const user = {
        telegramId: initData.user.id,
        userName: initData.user.username,
        firstName: initData.user.first_name,
        lastName: initData.user.last_name,
        avatar: initData.user.photo_url,
        numGames: 12, // mock
        numWins: 4,   // mock
        stars: 10     // mock
      };
      localStorage.setItem('user', JSON.stringify(user));
    }
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      navigate('/start');
    }
  }, [progress, navigate]);

  return (
    <div className="loader">
      <div className="loader-bar">
        <div className="loader-progress" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="loader-version">v1.0.0</div>
    </div>
  );
};

export default Loader;
