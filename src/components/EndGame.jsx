import React from "react";
import "./EndGame.css"; // Подключение стилей для экрана победителя
import WinEffect from "./WinEffect"; // Импорт WinEffect

const EndGame = ({ winner, onBack }) => {
  return (
    <div className="end-game">
      <WinEffect />  {/* Добавляем WinEffect */}

      <div className="winner-info">
        <img className="winner-avatar" src={winner.avatar} alt="Winner Avatar" />
        <h2>{winner.name} Wins!</h2>
      </div>

      <button className="back-to-start" onClick={onBack}>
        Go Back to Start Screen
      </button>
    </div>
  );
};

export default EndGame;
