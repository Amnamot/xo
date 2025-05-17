// GameHeader.jsx
import React, { useEffect, useState } from "react";
import "./GameHeader.css";
import logoIcon from '../media/3tbICO.svg';

const GameHeader = ({ 
  currentPlayer, 
  moveTimer, 
  time, 
  opponentInfo,
  playerTime1 = 0,
  playerTime2 = 0,
  isConnected = true,
  isCreator = false
}) => {
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

  const formatPlayerTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const tenths = Math.floor((milliseconds % 1000) / 100);
    return `${seconds} : ${tenths}`;
  };

  // Данные текущего игрока из Telegram
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const currentUserAvatar = tgUser?.photo_url || "/media/JohnAva.png";
  const currentUserName = tgUser?.first_name || "You";

  // Определяем, какой игрок где (создатель всегда слева)
  const leftPlayerAvatar = isCreator ? currentUserAvatar : (opponentInfo?.avatar || "../media/buddha.svg");
  const leftPlayerName = isCreator ? currentUserName : (opponentInfo?.name || "Opponent");
  const rightPlayerAvatar = isCreator ? (opponentInfo?.avatar || "../media/buddha.svg") : currentUserAvatar;
  const rightPlayerName = isCreator ? (opponentInfo?.name || "Opponent") : currentUserName;

  return (
    <>
      <div className="top-logo">
        <img src={logoIcon} width={128} alt="Logo" />
        {!isConnected && (
          <div className="connection-status">
            Переподключение...
          </div>
        )}
      </div>

      <div className="gameplayers">
        <div className="gamer1">
          <img className="avagamer1" src={leftPlayerAvatar} alt="Player X" />
          <div className="namegamer1">{leftPlayerName}</div>
          <div className="player-timer" style={{ color: currentPlayer === "X" ? "#6800D7" : "#000" }}>
            {formatPlayerTime(playerTime1)}
          </div>
        </div>

        <div className="times">
          <div className="time">{formatTotalTime(time)}</div>
          <div className="timer" style={{ color: timerColor }}>
            {formatMoveTimer(moveTimer)}
          </div>
        </div>

        <div className="gamer2">
          <img className="avagamer2" src={rightPlayerAvatar} alt="Player O" />
          <div className="namegamer2">{rightPlayerName}</div>
          <div className="player-timer" style={{ color: currentPlayer === "O" ? "#E10303" : "#000" }}>
            {formatPlayerTime(playerTime2)}
          </div>
        </div>
      </div>
    </>
  );
};

export default GameHeader;
