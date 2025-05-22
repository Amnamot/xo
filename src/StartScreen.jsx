// src/StartScreen.jsx v14
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopUpModal from './components/TopUpModal';
import './StartScreen.css';
import { 
  createLobby, 
  createInviteWS,
  checkAndRestoreGameState 
} from './services/socket';
import logoIcon from './media/3tbICO.svg';
import WaitModal from './components/WaitModal';
import { useSocket } from './context/SocketContext';

const StartScreen = () => {
  const [user, setUser] = useState(null);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showWaitModal, setShowWaitModal] = useState(false);
  const [creatorMarker, setCreatorMarker] = useState('');
  const initData = window.Telegram?.WebApp?.initData;
  const navigate = useNavigate();
  const socket = useSocket();
  const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();

  useEffect(() => {
    const initializeUI = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (!parsed.avatar) {
            const tgPhoto = window.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url;
            if (tgPhoto) {
              parsed.avatar = tgPhoto;
            }
          }
          setUser(parsed);
        }
      } catch (error) {
        console.error("Failed to initialize UI:", error);
      }
    };

    initializeUI();
  }, []);

  useEffect(() => {
    if (!socket || !telegramId) return;
    
    if (!socket.connected) {
      socket.connect();
    }

    const handleGameStart = (data) => {
      if (data?.session?.id) {
        setShowWaitModal(false);
        navigate(`/game/${data.session.id}`);
      }
    };

    const handleSetShowWaitModal = (data) => {
      if (data.show) {
        setShowWaitModal(true);
        if (data.creatorMarker) {
          setCreatorMarker(data.creatorMarker);
        }
      } else {
        setShowWaitModal(false);
      }
    };

    const handleLobbyReady = (data) => {
      if (data.creatorMarker) {
        setCreatorMarker(data.creatorMarker);
        setShowWaitModal(true);
      }
    };

    socket.on('gameStart', handleGameStart);
    socket.on('setShowWaitModal', handleSetShowWaitModal);
    socket.on('lobbyReady', handleLobbyReady);

    // Проверяем сохраненное состояние при инициализации
    (async () => {
      try {
        const gameState = await checkAndRestoreGameState(socket, telegramId);
        if (gameState?.gameId) {
          navigate(`/game/${gameState.gameId}`);
        }
      } catch (error) {
        console.warn('No saved game state found:', error);
      }
    })();

    return () => {
      socket.off('gameStart', handleGameStart);
      socket.off('setShowWaitModal', handleSetShowWaitModal);
      socket.off('lobbyReady', handleLobbyReady);
    };
  }, [socket, telegramId, navigate]);

  const handleStartGame = async () => {
    try {
      if (!telegramId) {
        throw new Error("Missing Telegram ID");
      }

      const lobbyResponse = await createLobby(socket, telegramId);
      setShowWaitModal(true);

      const inviteData = await createInviteWS(socket, telegramId);

      if (window.Telegram?.WebApp?.shareMessage) {
        await window.Telegram.WebApp.shareMessage(inviteData.messageId);
      }

    } catch (error) {
      console.error('Failed to start game:', error);
      setShowWaitModal(false);
      if (socket.connected) {
        socket.disconnect();
      }
      alert(error.message || 'Failed to start game. Please try again.');
    }
  };

  const handleCancelLobby = async () => {
    if (!telegramId) {
      setShowWaitModal(false);
      return;
    }

    try {
      socket.once('lobbyDeleted', () => {
        setShowWaitModal(false);
        if (socket.connected) {
          socket.disconnect();
        }
      });

      socket.emit('cancelLobby', {
        telegramId: telegramId.toString()
      });

    } catch (error) {
      console.error('Failed to cancel lobby:', error);
      setShowWaitModal(false);
      alert(error.message || "Failed to cancel lobby");
    }
  };

  const handleJoinLobby = async (lobbyId) => {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    
    if (socket.connected) {
      socket.emit('joinLobby', {
        telegramId: user.id.toString(),
        lobbyId: lobbyId
      });
    }
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

  if (!user) return null;

  return (
    <div className="start-screen">
      {showWaitModal && <WaitModal 
        onCancel={handleCancelLobby}
        creatorMarker={creatorMarker}
      />}
      <div className="top-logo">
        <img src={logoIcon} width={128} alt="Logo" />
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
