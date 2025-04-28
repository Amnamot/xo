import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./EndGame.css";
import WinEffect from "./WinEffect";

const EndGame = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { winnerAvatar, winnerName } = location.state || {};

  if (!winnerAvatar) {
    return <div>Error: No winner data</div>;
  }

  const handleBackToStart = () => {
    navigate("/", { replace: true });
  };

  return (
    <div className="end-game">
      <WinEffect />

      <div className="winner-info">
        <h1 className="gameoverwin">GAME OVER</h1>
        <img className="winner-avatar" src={winnerAvatar} alt="Winner Avatar" />
        <h2 className="youwin">{winnerName} wins!</h2>
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
