import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./LostGame.css";

const LostGame = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lostAvatar, lostName } = location.state || {};

  const avatarSrc = lostAvatar || "/media/buddha.svg"; // ✅ Если нет аватарки, используем buddha.svg

  const handleBackToStart = () => {
    navigate("/", { replace: true });
  };

  return (
    <div className="end-game">
      <div className="lost-info">
        <h1 className="gameover">GAME OVER</h1>
        <img className="lost-avatar" src={avatarSrc} alt="Lost Avatar" />
        <h2 className="youlost">{lostName || "Unknown Player"}, you lost!</h2>
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
