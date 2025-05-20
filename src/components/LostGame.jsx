import React from "react";
import { useNavigate } from "react-router-dom";
import "./LostGame.css";

const LostGame = () => {
  const navigate = useNavigate();

  // ✅ Получаем данные пользователя из initData
  const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const avatarSrc = user?.photo_url || "/media/buddha.svg";
  const userName = user?.first_name || "You";

  const handleBackToStart = () => {
    navigate("/", { replace: true });
  };

  return (
    <div className="end-game">
      <div className="lost-info">
        <h1 className="gameover">GAME OVER</h1>
        <img className="lost-avatar" src={avatarSrc} alt="Lost Avatar" />
        <h2 className="youlost">{userName}, you lost!</h2>
        <p className="congrat">Victory awaits you ahead!</p>
        <p className="congrat">Try again.</p>
      </div>

      <button className="back-to-start" onClick={handleBackToStart}>
        Go Back to Start Screen
      </button>
    </div>
  );
};

export default LostGame;
