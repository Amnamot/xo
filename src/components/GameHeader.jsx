// GameHeader.jsx
import React, { useEffect, useState } from "react";
import "./GameHeader.css";
import logoIcon from '../media/3tbICO.svg';

const GameHeader = ({ gameSession, currentPlayer, onExit }) => {
  const [timerColor, setTimerColor] = useState("#6800D7");
  const [isGameStarted, setIsGameStarted] = useState(false);

  console.log('[DEBUG][FRONT][GAMEHEADER]', {
    gameSession,
    currentPlayer,
    players: gameSession?.players,
    timestamp: new Date().toISOString()
  });

  if (!gameSession || !currentPlayer) {
    return null;
  }

  const player = gameSession.players[currentPlayer];
  const opponent = Object.values(gameSession.players).find(p => p.isOpponent);

  if (!player || !opponent) {
    return null;
  }

  useEffect(() => {
    if (currentPlayer === "X") {
      setTimerColor("#6800D7");
    } else if (currentPlayer === "O") {
      setTimerColor("#E10303");
    }
  }, [currentPlayer]);

  // Добавляем эффект для инициализации таймеров
  useEffect(() => {
    if (currentPlayer && player.moveTimer > 0 && !isGameStarted) {
      console.log('🎮 [GameHeader] Game started, initializing timers', {
        currentPlayer,
        moveTimer: player.moveTimer,
        time: player.time,
        playerTime1: player.playerTime1,
        playerTime2: player.playerTime2,
        timestamp: new Date().toISOString()
      });
      setIsGameStarted(true);
    }
  }, [currentPlayer, player.moveTimer, player.time, player.playerTime1, player.playerTime2]);

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
  const currentUserAvatar = tgUser?.photo_url || "../media/JohnAva.png";
  const currentUserName = tgUser?.first_name || "You";

  console.log('[DEBUG][FRONT][GAMEHEADER_PROPS]', {
    currentPlayer,
    moveTimer: player.moveTimer,
    time: player.time,
    playerTime1: player.playerTime1,
    playerTime2: player.playerTime2,
    opponentInfo: opponent,
    isConnected: player.isConnected,
    isCreator: player.isCreator,
    telegramId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
    timestamp: new Date().toISOString()
  });

  // Определяем, какой игрок где (создатель всегда слева)
  const leftPlayerAvatar = player.isCreator === null ? "../media/JohnAva.png" : 
    (player.isCreator ? currentUserAvatar : (opponent?.avatar || "../media/JohnAva.png"));
  const leftPlayerName = player.isCreator === null ? "Loading..." : 
    (player.isCreator ? currentUserName : (opponent?.name || "Opponent"));
  const rightPlayerAvatar = player.isCreator === null ? "../media/JohnAva.png" : 
    (player.isCreator ? (opponent?.avatar || "../media/JohnAva.png") : currentUserAvatar);
  const rightPlayerName = player.isCreator === null ? "Loading..." : 
    (player.isCreator ? (opponent?.name || "Opponent") : currentUserName);

  console.log('[DEBUG][FRONT][GAMEHEADER_CALC]', {
    isCreator: player.isCreator,
    leftPlayerName,
    rightPlayerName,
    leftPlayerAvatar,
    rightPlayerAvatar,
    timestamp: new Date().toISOString()
  });

  // Оптимизированное логирование: только при изменении ключевых данных
  useEffect(() => {
    console.log('[DEBUG][FRONT][GameHeader]', {
      isCreator: player.isCreator,
      leftPlayerName,
      rightPlayerName,
      opponentInfo: opponent,
      currentUserName,
      telegramId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
      timestamp: new Date().toISOString()
    });
  }, [player.isCreator, leftPlayerName, rightPlayerName, opponent]);

  return (
    <>
      <div className="top-logo">
        <img src={logoIcon} width={128} alt="Logo" />
        {/* Индикатор переподключения временно скрыт
        {!player.isConnected && (
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
            {formatPlayerTime(player.playerTime1)}
          </div>
        </div>

        <div className="times">
          <div className="time">{formatTimer(player.time)}</div>
          <div className="timer" style={{ color: timerColor }}>
            {formatTimer(player.moveTimer)}
          </div>
        </div>

        <div className="gamer2">
          <img className="avagamer2" src={rightPlayerAvatar} alt="Player O" />
          <div className="namegamer2">{rightPlayerName}</div>
          <div className="player-timer" style={{ color: currentPlayer === "O" ? "#E10303" : "#000" }}>
            {formatPlayerTime(player.playerTime2)}
          </div>
        </div>
      </div>
    </>
  );
};

export default GameHeader;
