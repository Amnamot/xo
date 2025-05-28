// GameHeader.jsx
import React, { useEffect, useState, useRef } from "react";
import "./GameHeader.css";
import logoIcon from '../media/3tbICO.svg';

const GameHeader = ({ gameSession, currentPlayer, onExit }) => {
  console.log('🎮 [GameHeader] Component mounted:', {
    hasGameSession: !!gameSession,
    currentPlayer,
    timestamp: new Date().toISOString()
  });

  const [timerColor, setTimerColor] = useState("#6800D7");
  const [playerInfo, setPlayerInfo] = useState({
    leftPlayerAvatar: "",
    leftPlayerName: "Loading...",
    rightPlayerAvatar: "",
    rightPlayerName: "Loading..."
  });

  // Флаги для однократного логирования
  const loggedGameHeader = useRef(false);
  const loggedGameHeaderProps = useRef(false);
  const loggedGameHeaderCalc = useRef(false);
  const loggedGameHeaderDebug = useRef(false);

  useEffect(() => {
    if (currentPlayer === "x") {
      setTimerColor("#6800D7");
    } else if (currentPlayer === "o") {
      setTimerColor("#E10303");
    }
  }, [currentPlayer]);

  useEffect(() => {
    console.log('🎮 [GameHeader] Checking game state:', {
      currentPlayer,
      hasGameSession: !!gameSession,
      hasPlayers: !!gameSession?.players,
      hasCurrentPlayer: !!gameSession?.players?.[currentPlayer],
      hasMoveTimer: !!gameSession?.players?.[currentPlayer]?.moveTimer,
      moveTimerValue: gameSession?.players?.[currentPlayer]?.moveTimer,
      timestamp: new Date().toISOString()
    });
  }, [currentPlayer, gameSession]);

  useEffect(() => {
    if (gameSession?.players?.[currentPlayer]) {
      if (!loggedGameHeader.current) {
        console.log('[DEBUG][FRONT][GameHeader]', {
          isCreator: gameSession.players[currentPlayer].isCreator,
          leftPlayerName: gameSession.players[currentPlayer].name,
          rightPlayerName: Object.values(gameSession.players).find(p => p.isOpponent)?.name,
          opponentInfo: Object.values(gameSession.players).find(p => p.isOpponent),
          currentUserName: window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name,
          telegramId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
          timestamp: new Date().toISOString()
        });
        loggedGameHeader.current = true;
      }
    }
  }, [gameSession, currentPlayer]);

  useEffect(() => {
    if (!loggedGameHeaderProps.current && gameSession && currentPlayer) {
      const player = gameSession.players[currentPlayer];
      const opponent = Object.values(gameSession.players).find(p => p.isOpponent);
      console.log('[DEBUG][FRONT][GAMEHEADER_PROPS]', {
        currentPlayer,
        moveTimer: player?.moveTimer,
        time: player?.time,
        playerTime1: player?.playerTime1,
        playerTime2: player?.playerTime2,
        opponentInfo: opponent,
        isConnected: player?.isConnected,
        isCreator: player?.isCreator,
        telegramId: window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
        timestamp: new Date().toISOString()
      });
      loggedGameHeaderProps.current = true;
    }
  }, [gameSession, currentPlayer]);

  useEffect(() => {
    if (gameSession && currentPlayer) {
      const player = gameSession.players[currentPlayer];
      const opponent = Object.values(gameSession.players).find(p => p.isOpponent);
      
      // Данные текущего игрока из Telegram
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      const currentUserAvatar = tgUser?.photo_url;
      const currentUserName = tgUser?.first_name;

      // Определяем, какой игрок где (создатель всегда слева)
      const leftPlayerAvatar = player.isCreator === null ? "" : 
        (player.isCreator ? currentUserAvatar : opponent?.avatar);
      const leftPlayerName = player.isCreator === null ? "Loading..." : 
        (player.isCreator ? currentUserName : opponent?.name);
      const rightPlayerAvatar = player.isCreator === null ? "" : 
        (player.isCreator ? opponent?.avatar : currentUserAvatar);
      const rightPlayerName = player.isCreator === null ? "Loading..." : 
        (player.isCreator ? opponent?.name : currentUserName);

      setPlayerInfo({
        leftPlayerAvatar,
        leftPlayerName,
        rightPlayerAvatar,
        rightPlayerName
      });

      if (!loggedGameHeaderCalc.current) {
        console.log('[DEBUG][FRONT][GAMEHEADER_CALC]', {
          isCreator: player.isCreator,
          leftPlayerName,
          rightPlayerName,
          leftPlayerAvatar,
          rightPlayerAvatar,
          timestamp: new Date().toISOString()
        });
        loggedGameHeaderCalc.current = true;
      }
    }
  }, [gameSession, currentPlayer]);

  console.log('🎮 [GameHeader] Before first check:', {
    hasGameSession: !!gameSession,
    currentPlayer,
    timestamp: new Date().toISOString()
  });

  // Проверяем существование gameSession и currentPlayer
  if (!gameSession?.players || !currentPlayer || !gameSession.players[currentPlayer]) {
    console.log('⚠️ [GameHeader] Missing required props:', {
      hasGameSession: !!gameSession,
      hasPlayers: !!gameSession?.players,
      currentPlayer,
      hasCurrentPlayer: !!gameSession?.players?.[currentPlayer],
      timestamp: new Date().toISOString()
    });
    return null;
  }

  const player = gameSession.players[currentPlayer];
  const opponent = Object.values(gameSession.players).find(p => p.isOpponent);

  // Проверяем существование player
  if (!player) {
    console.log('⚠️ [GameHeader] Player not found:', {
      currentPlayer,
      availablePlayers: Object.keys(gameSession.players),
      timestamp: new Date().toISOString()
    });
    return null;
  }

  console.log('🎮 [GameHeader] Before second check:', {
    hasPlayer: !!player,
    hasOpponent: !!opponent,
    player,
    opponent,
    timestamp: new Date().toISOString()
  });

  const formatTimer = (time) => {
    if (!time === undefined || time === null) return "00:00";
    const minutes = Math.floor(time / 6000);
    const seconds = Math.floor((time % 6000) / 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatPlayerTime = (time) => {
    if (!time === undefined || time === null) return "00:00";
    const minutes = Math.floor(time / 6000);
    const seconds = Math.floor((time % 6000) / 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

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
          <img className="avagamer1" src={playerInfo.leftPlayerAvatar} alt="Player X" />
          <div className="namegamer1">{playerInfo.leftPlayerName}</div>
          <div className="player-timer" style={{ color: currentPlayer === "x" ? "#6800D7" : "#000" }}>
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
          <img className="avagamer2" src={playerInfo.rightPlayerAvatar} alt="Player O" />
          <div className="namegamer2">{playerInfo.rightPlayerName}</div>
          <div className="player-timer" style={{ color: currentPlayer === "o" ? "#E10303" : "#000" }}>
            {formatPlayerTime(player.playerTime2)}
          </div>
        </div>
      </div>
    </>
  );
};

export default GameHeader;
