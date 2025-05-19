import React from "react";
import { useNavigate } from "react-router-dom";
import "./EndGame.css";
import WinEffect from "./WinEffect";

const EndGame = () => {
  const navigate = useNavigate();

  // ✅ Всегда берём аватарку из initData
  const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const avatarSrc = user?.photo_url || "/src/media/JohnAva.png";
  const userName = user?.first_name || "You";

  const handleBackToStart = () => {
    navigate("/", { replace: true });
  };

  return (
    <div className="end-game">
      <WinEffect />

      <div className="winner-info">
        <h1 className="gameoverwin">GAME OVER</h1>
        <img className="winner-avatar" src={avatarSrc} alt="Winner Avatar" />
        <h2 className="youwin">{userName} wins!</h2>
        <div className="cup">🏆</div>
        <p className="congrat">Congratulations!</p>
      </div>

      <button className="back-to-start" onClick={handleBackToStart}>
        Go Back to Start Screen
      </button>
    </div>
  );
};

export default EndGame;
