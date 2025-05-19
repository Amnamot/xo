// GameHeader.jsx
import React, { useEffect, useState, useRef } from "react";
import "./GameHeader.css";
import logoIcon from '../media/3tbICO.svg';
import buddhaIcon from '../media/buddha.svg';

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
  const [shouldBlink, setShouldBlink] = useState(false);
  const [blinkSpeed, setBlinkSpeed] = useState('normal');
  const nameRef1 = useRef(null);
  const nameRef2 = useRef(null);

  useEffect(() => {
    if (currentPlayer === "X") {
      setTimerColor("#6800D7");
      console.log('🎨 [GameHeader] Timer color changed to creator color', {
        color: "#6800D7",
        currentPlayer,
        timestamp: new Date().toISOString()
      });
    } else if (currentPlayer === "O") {
      setTimerColor("#E10303");
      console.log('🎨 [GameHeader] Timer color changed to opponent color', {
        color: "#E10303",
        currentPlayer,
        timestamp: new Date().toISOString()
      });
    }
  }, [currentPlayer]);

  useEffect(() => {
    if (moveTimer <= 700 && moveTimer > 300) {
      setShouldBlink(true);
      setBlinkSpeed('slow');
      console.log('⚡ [GameHeader] Timer started slow blinking', {
        moveTimer,
        blinkSpeed: 'slow',
        timestamp: new Date().toISOString()
      });
    } else if (moveTimer <= 300) {
      setShouldBlink(true);
      setBlinkSpeed('fast');
      console.log('⚡ [GameHeader] Timer started fast blinking', {
        moveTimer,
        blinkSpeed: 'fast',
        timestamp: new Date().toISOString()
      });
    } else {
      setShouldBlink(false);
      setBlinkSpeed('normal');
      console.log('⚡ [GameHeader] Timer blinking stopped', {
        moveTimer,
        blinkSpeed: 'normal',
        timestamp: new Date().toISOString()
      });
    }
  }, [moveTimer]);

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

  useEffect(() => {
    const adjustFontSize = (element) => {
      if (!element) return;
      const parent = element.parentElement;
      const parentWidth = parent.offsetWidth;
      let fontSize = 20;
      element.style.fontSize = `${fontSize}px`;
      
      while (element.offsetWidth > parentWidth && fontSize > 12) {
        fontSize--;
        element.style.fontSize = `${fontSize}px`;
      }

      console.log('📏 [GameHeader] Font size adjusted', {
        element: element.className,
        finalSize: fontSize,
        parentWidth,
        timestamp: new Date().toISOString()
      });
    };

    if (nameRef1.current) adjustFontSize(nameRef1.current);
    if (nameRef2.current) adjustFontSize(nameRef2.current);
  }, [playerInfo]);

  useEffect(() => {
    if (!isConnected) {
      console.log('🔌 [GameHeader] Connection lost', {
        isCreator,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('🔌 [GameHeader] Connection restored', {
        isCreator,
        timestamp: new Date().toISOString()
      });
    }
  }, [isConnected, isCreator]);

  const formatTimer = (time) => {
    if (!isGameStarted || time === undefined || time === null) return "0:00";
    const minutes = Math.floor(time / 6000);
    const seconds = Math.floor((time % 6000) / 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatPlayerTime = (time) => {
    if (!isGameStarted || time === undefined || time === null) return "0:00";
    const minutes = Math.floor(time / 6000);
    const seconds = Math.floor((time % 6000) / 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatMoveTimer = (time) => {
    if (!isGameStarted || time === undefined || time === null) return "0:0";
    const seconds = Math.floor(time / 100);
    const tenths = Math.floor((time % 100) / 10);
    return `${seconds}:${tenths}`;
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

  console.log('👥 [GameHeader] Player info updated', {
    isCreator,
    leftPlayer: {
      name: leftPlayerName,
      avatar: leftPlayerAvatar
    },
    rightPlayer: {
      name: rightPlayerName,
      avatar: rightPlayerAvatar
    },
    timestamp: new Date().toISOString()
  });

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
          <div style={{ position: 'relative' }}>
            <img className="avagamer1" src={leftPlayerAvatar} alt="Player X" />
            {!isConnected && (
              <div className="buddha-overlay visible">
                <img src={buddhaIcon} alt="Buddha" style={{ width: '50%', height: '50%' }} />
              </div>
            )}
          </div>
          <div className="namegamer1" ref={nameRef1}>{leftPlayerName}</div>
          <div className="player-timer" style={{ color: currentPlayer === "X" ? "#6800D7" : "#000" }}>
            {formatPlayerTime(playerTime1)}
          </div>
        </div>

        <div className="times">
          <div className="time">{formatTimer(time)}</div>
          <div 
            className={`timer ${shouldBlink ? `blink-${blinkSpeed}` : ''}`} 
            style={{ color: timerColor }}
          >
            {formatMoveTimer(moveTimer)}
          </div>
        </div>

        <div className="gamer2">
          <div style={{ position: 'relative' }}>
            <img className="avagamer2" src={rightPlayerAvatar} alt="Player O" />
            {!isConnected && (
              <div className="buddha-overlay visible">
                <img src={buddhaIcon} alt="Buddha" style={{ width: '50%', height: '50%' }} />
              </div>
            )}
          </div>
          <div className="namegamer2" ref={nameRef2}>{rightPlayerName}</div>
          <div className="player-timer" style={{ color: currentPlayer === "O" ? "#E10303" : "#000" }}>
            {formatPlayerTime(playerTime2)}
          </div>
        </div>
      </div>
    </>
  );
};

export default GameHeader;
