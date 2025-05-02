// GameHeader.jsx
import React, { useEffect, useState } from "react";
import "./GameHeader.css";

const GameHeader = ({ currentPlayer, moveTimer, time, opponentAvatar }) => {
  const [timerColor, setTimerColor] = useState("#6800D7");

  useEffect(() => {
    if (currentPlayer === "X") {
      setTimerColor("#6800D7");
    } else if (currentPlayer === "O") {
      setTimerColor("#E10303");
    }
  }, [currentPlayer]);

  const formatMoveTimer = (hundredths) => {
    const seconds = Math.floor(hundredths / 100);
    const tenths = Math.floor((hundredths % 100) / 10);
    return `${String(seconds).padStart(2, "0")}:${tenths}`;
  };

  const formatTotalTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // ✅ Берём данные текущего игрока из Telegram initData
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const userAvatar = tgUser?.photo_url || "/media/JohnAva.png";
  const userName = tgUser?.first_name || "You";

  return (
    <>
      <div className="top-logo">
        <img src="/media/3tICO.svg" width={128} alt="Logo" />
      </div>

      <div className="gameplayers">
        <div className="gamer1">
          <img className="avagamer1" src={userAvatar} alt="Player 1" />
          <div className="namegamer1">{userName}</div>
        </div>

        <div className="times">
          <div className="time">{formatTotalTime(time)}</div>
          <div className="timer" style={{ color: timerColor }}>
            {formatMoveTimer(moveTimer)}
          </div>
        </div>

        <div className="gamer2">
          <img className="avagamer2" src={opponentAvatar || "/media/buddha.svg"} alt="Player 2" />
          <div className="namegamer2">Opponent</div>
        </div>
      </div>
    </>
  );
};

export default GameHeader;
