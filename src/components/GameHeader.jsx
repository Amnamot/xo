// GameHeader.jsx
import React, { useEffect, useState } from "react";
import "./GameHeader.css";

const GameHeader = ({ currentPlayer, moveTimer, time }) => {
  const [timerColor, setTimerColor] = useState("#6800D7"); // Цвет таймера для X по умолчанию

  useEffect(() => {
    if (currentPlayer === "X") {
      setTimerColor("#6800D7");
    } else if (currentPlayer === "O") {
      setTimerColor("#E10303");
    }
  }, [currentPlayer]);

  const formatMoveTimer = (hundredths) => {
    const seconds = Math.floor(hundredths / 100);
    const tenths = Math.floor((hundredths % 100) / 10); // делим остаток на 10
    return `${String(seconds).padStart(2, "0")}:${tenths}`;
  };

  const formatTotalTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <>
      <div className="top-logo">
        <img src="/media/3tICO.svg" width={128} alt="Logo" />
      </div>

      <div className="gameplayers">
        <div className="gamer1">
          <img className="avagamer1" src="/media/JohnAva.png" alt="Player 1" />
          <div className="namegamer1">John</div>
        </div>

        <div className="times">
          <div className="time">
            {formatTotalTime(time)}
          </div>
          <div className="timer" style={{ color: timerColor }}>
            {formatMoveTimer(moveTimer)}
          </div>
        </div>

        <div className="gamer2">
          <img className="avagamer2" src="/media/buddha.svg" alt="Player 2" />
          <div className="namegamer2">Marina</div>
        </div>
      </div>
    </>
  );
};

export default GameHeader;
