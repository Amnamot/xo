// src/StartScreen.jsx v12
import WaitModal from './components/WaitModal';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopUpModal from './components/TopUpModal';
import ConnectionStatus from './components/ConnectionStatus';
import './StartScreen.css';
import { socket } from './services/socket';

const StartScreen = () => {
  const [user, setUser] = useState(null);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showWaitModal, setShowWaitModal] = useState(false);
  const initData = window.Telegram?.WebApp?.initData;
  const navigate = useNavigate();

  useEffect(() => {
    const shouldShow = localStorage.getItem("showWaitModal") === "true";
    if (shouldShow) {
      setShowWaitModal(true);
      localStorage.removeItem("showWaitModal");
    }

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);

        if (!parsed.avatar) {
          const tgPhoto = window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url;
          if (tgPhoto) {
            parsed.avatar = tgPhoto;
          }
        }

        setUser(parsed);
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
      }
    }

    // Проверяем, есть ли активное лобби
    const activeLobbyId = localStorage.getItem("lobbyIdToJoin");
    if (activeLobbyId) {
      // Подключаемся к WebSocket только если есть активное лобби
      socket.connect();

      // Подписываемся на события WebSocket
      socket.on('gameStart', (data) => {
        console.log('Game started:', data);
        const { creator, opponent, session } = data;
        
        // Получаем текущий telegramId пользователя
        const currentTelegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
        
        // Определяем, является ли текущий пользователь создателем
        const isCreator = currentTelegramId === creator;
        
        // Сохраняем данные сессии
        localStorage.setItem('gameSession', JSON.stringify(session));
        
        // Переходим на страницу игры
        navigate(`/game/${session.id}`);
      });
    }

    const rawInitData = window.Telegram?.WebApp?.initData;
    if (rawInitData) {
      const clean = new URLSearchParams(rawInitData);
      clean.delete('signature');
      console.log("🧾 Clean initData:", clean.toString());
    }

    return () => {
      // Отключаем WebSocket при размонтировании компонента только если он был подключен
      if (socket.connected) {
        socket.disconnect();
        socket.off('gameStart');
      }
    };
  }, [navigate]);

  const handleCancelLobby = async () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const lobbyId = localStorage.getItem("lobbyIdToJoin");

    console.log("Debug cancel lobby:", {
      storedUser,
      lobbyId,
      hasStoredUser: !!storedUser,
      hasTelegramId: !!storedUser?.telegramId,
      hasLobbyId: !!lobbyId
    });

    if (!storedUser?.telegramId || !lobbyId) {
      console.error("Missing required data for lobby cancellation:", {
        telegramId: storedUser?.telegramId,
        lobbyId
      });
      setShowWaitModal(false);
      return;
    }

    // Отправляем событие отмены лобби через WebSocket
    socket.emit('cancelLobby', {
      lobbyId,
      telegramId: storedUser.telegramId
    });

    // Отключаем WebSocket после отмены лобби
    if (socket.connected) {
      socket.disconnect();
    }

    localStorage.removeItem("lobbyIdToJoin");
    setShowWaitModal(false);
  };

  const screenWidth = window.innerWidth;
  const containerWidth = (screenWidth / 12) * 10;

  const showEndingGames = user?.numGames >= 9;
  const showStarInfo = user?.numGames >= 11;
  const showTopUp = user?.numGames >= 11 && user?.stars <= 10;
  const disableStart = user?.numGames >= 12 && user?.stars < 10;

  const getEndingText = () => {
    if (user.numGames === 11) {
      return "У тебя осталась одна игра\nYou need to top up your balance";
    }
    if (user.numGames >= 12 && user.stars < 10) {
      return "Стоимость одной игры 10 звезд\nTop up your balance";
    }
    if (user.numGames >= 9 && user.stars <= 10) {
      return "У тебя заканчиваются игры\nПотом тебе потребуются звезды";
    }
    return null;
  };

  const handleStartGame = async () => {
    if (localStorage.getItem("lobbyIdToJoin")) return;
    
    try {
      if (!initData) {
        alert("initData not found");
        return;
      }

      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramId) {
        alert("Telegram user ID not found");
        return;
      }

      // Подключаем WebSocket перед созданием лобби
      socket.connect();

      console.log('🔄 1. Connecting WebSocket...');

      // Подписываемся на события WebSocket
      socket.on('gameStart', (data) => {
        console.log('✅ WebSocket: Game started event received:', data);
        const { creator, opponent, session } = data;
        
        // Получаем текущий telegramId пользователя
        const currentTelegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
        
        // Определяем, является ли текущий пользователь создателем
        const isCreator = currentTelegramId === creator;
        console.log('👤 Current user role:', isCreator ? 'creator' : 'opponent');
        
        // Сохраняем данные сессии
        localStorage.setItem('gameSession', JSON.stringify(session));
        
        // Переходим на страницу игры
        navigate(`/game/${session.id}`);
      });

      // Создаем лобби через WebSocket
      console.log('🔄 2. Creating lobby via WebSocket...');
      socket.emit('createLobby', {
        telegramId: telegramId.toString()
      }, (response) => {
        console.log('✅ WebSocket: Create lobby response:', response);
        if (response?.error) {
          console.error('❌ Failed to create lobby:', response.error);
          alert('Failed to create game lobby');
          // Отключаем WebSocket при ошибке
          socket.disconnect();
          return;
        }
        
        if (response?.lobbyId) {
          console.log('✅ Lobby created, ID:', response.lobbyId);
          localStorage.setItem("lobbyIdToJoin", response.lobbyId);
        }
      });

      // Сохраняем telegramId пользователя
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      storedUser.telegramId = telegramId.toString();
      localStorage.setItem("user", JSON.stringify(storedUser));

      // Показываем модальное окно ожидания
      setShowWaitModal(true);

      console.log('🔄 3. Creating invite via REST API...');
      console.log('Request details:', {
        telegramId: telegramId.toString(),
        initDataRaw,
        requestBody: {
          initData: initData,
          telegramId: telegramId.toString()
        }
      });

      const initDataRaw = window.Telegram?.WebApp?.initData;
      
      // Создаем приглашение через Telegram
      const response = await fetch("https://api.igra.top/lobby/createInvite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          initData: initDataRaw,
          telegramId: telegramId.toString()
        })
      });

      console.log('📥 API Response status:', response.status);
      const data = await response.json();
      console.log('📥 API Response data:', data);

      if (typeof data.messageId !== 'undefined') {
        try {
          console.log('🔄 4. Sharing message via Telegram...');
          window.Telegram?.WebApp?.shareMessage(data.messageId);
          console.log('✅ Message shared successfully');
        } catch (err) {
          console.warn("❌ Telegram API error:", err);
        }
      } else {
        console.error('❌ No messageId in response');
        alert("Ошибка при создании приглашения");
        setShowWaitModal(false);
        // Отключаем WebSocket при ошибке
        socket.disconnect();
      }
    } catch (err) {
      console.error("Ошибка при создании лобби:", err);
      setShowWaitModal(false);
      // Отключаем WebSocket при ошибке
      socket.disconnect();
    }
  };

  if (!user) return null;

  return (
    <div className="start-screen">
      <ConnectionStatus />
      {showWaitModal && <WaitModal onCancel={handleCancelLobby} />}
      <div className="top-logo">
        <img src="../media/3tICO.svg" width={128} alt="Logo" />
      </div>

      <div className="user-info">
        <img className="ava1" src={user.avatar} alt="avatar" />
        <div className="user-data">
          <div className="name1">{user.firstName}</div>
          <div className="stata1">
            Games: <span className="stata2">{user.numGames}</span> Wins: <span className="stata2">{user.numWins}</span>
          </div>
        </div>
      </div>

      {showEndingGames && (
        <div className="ninegames" style={{ width: containerWidth }}>
          <div className="endinggames">{getEndingText()}</div>

          {showStarInfo && (
            <div className="starinfo">
              <div className="balance">Balance</div>
              <div className="star">
                <img src="/media/TGstar.svg" alt="star" />
              </div>
              <div className="starsvalue">{user.stars}</div>
            </div>
          )}

          {showTopUp && (
            <button className="topup" onClick={() => setShowTopUpModal(true)}>
              Top up
            </button>
          )}
        </div>
      )}

      <div
        className="bottom-block"
        style={{
          width: containerWidth,
          opacity: disableStart ? 0.3 : 1,
          pointerEvents: disableStart ? 'none' : 'auto',
        }}
      >
        <div className="call1">
          To start the game by inviting an opponent, just click on this button
        </div>
        {user.numGames >= 12 ? (
          <button
            className="button2"
            onClick={handleStartGame}
            disabled={disableStart}
          >
            Start for 10 stars
          </button>
        ) : (
          <button className="button1" onClick={handleStartGame}>
            Start
          </button>
        )}
      </div>

      {showTopUpModal && <TopUpModal onClose={() => setShowTopUpModal(false)} />}
    </div>
  );
};

export default StartScreen;
