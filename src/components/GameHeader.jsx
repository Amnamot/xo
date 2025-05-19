// GameHeader.jsx
import React, { useEffect, useState } from "react";
import "./GameHeader.css";
import logoIcon from '../media/3tbICO.svg';

const GameHeader = ({ 
  currentPlayer, 
  moveTimer, 
  time, 
  playerTime1 = 0,
  playerTime2 = 0,
  isConnected = true,
  isCreator = false,
  playerInfo = {
    creator: { avatar: null, name: null },
    opponent: { avatar: null, name: null }
  }
}) => {
  const [timerColor, setTimerColor] = useState("#6800D7");
  const [isGameStarted, setIsGameStarted] = useState(false);

  useEffect(() => {
    if (currentPlayer === "X") {
      setTimerColor("#6800D7");
    } else if (currentPlayer === "O") {
      setTimerColor("#E10303");
    }
  }, [currentPlayer]);

  // Добавляем эффект для инициализации таймеров
  useEffect(() => {
    if (currentPlayer && moveTimer > 0 && !isGameStarted) {
      console.log('🎮 [GameHeader] Game started, initializing timers', {
        currentPlayer,
        moveTimer,
        time,
        playerTime1,
        playerTime2,
        timestamp: new Date().toISOString()
      });
      setIsGameStarted(true);
    }
  }, [currentPlayer, moveTimer, time, playerTime1, playerTime2]);

  const formatTimer = (time) => {
    if (!isGameStarted || time === undefined || time === null) return "00:00";
    const minutes = Math.floor(time / 6000);
    const seconds = Math.floor((time % 6000) / 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatPlayerTime = (time) => {
    if (!isGameStarted || time === undefined || time === null) return "00:00";
    const minutes = Math.floor(time / 6000);
    const seconds = Math.floor((time % 6000) / 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Данные текущего игрока из Telegram
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const currentUserAvatar = tgUser?.photo_url || "/media/JohnAva.png";
  const currentUserName = tgUser?.first_name || "You";

  // Определяем, какой игрок где (создатель всегда слева)
  const leftPlayerAvatar = isCreator ? currentUserAvatar : (playerInfo.opponent.avatar || "/media/JohnAva.png");
  const leftPlayerName = isCreator ? currentUserName : (playerInfo.opponent.name || "Opponent");
  const rightPlayerAvatar = isCreator ? (playerInfo.opponent.avatar || "/media/JohnAva.png") : currentUserAvatar;
  const rightPlayerName = isCreator ? (playerInfo.opponent.name || "Opponent") : currentUserName;

  return (
    <>
      <div className="top-logo">
        <img src={logoIcon} width={128} alt="Logo" />
        {/* Индикатор переподключения временно скрыт
        {!isConnected && (
          <div className="connection-status">
            Переподключение...
          </div>
        )}
        */}
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
          <div className="time">{formatTimer(time)}</div>
          <div className="timer" style={{ color: timerColor }}>
            {formatTimer(moveTimer)}
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
