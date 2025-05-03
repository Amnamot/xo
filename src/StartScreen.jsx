// StartScreen.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopUpModal from './components/TopUpModal';
import './StartScreen.css';

const StartScreen = () => {
  const [user, setUser] = useState(null);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
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

    const rawInitData = window.Telegram?.WebApp?.initData;
    if (rawInitData) {
      const clean = new URLSearchParams(rawInitData);
      clean.delete('signature');
      console.log("🧾 Clean initData:", clean.toString());
    }
  }, []);

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

  const confirmStartGame = async () => {
    try {
      const initData = window.Telegram?.WebApp?.initData;
      const response = await fetch("https://api.igra.top/lobby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData })
      });
      const data = await response.json();
      if (data.lobbyId) {
        navigate(`/game?invite=${data.lobbyId}`);
      }
    } catch (err) {
      console.error("Ошибка при создании лобби:", err);
    }
  };

  const handleStartGame = () => {
    setShowPreviewModal(true);
  };

  if (!user) return null;

  return (
    <div className="start-screen">
      <div className="top-logo">
        <img src="/media/3tICO.svg" width={128} alt="Logo" />
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

      {showPreviewModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Предпросмотр Telegram-сообщения</h3>
            <img src="/media/invite-preview.png" alt="Preview" style={{ width: '100%', borderRadius: '12px' }} />
            <p>Пользователь <strong>{user.firstName}</strong> приглашает вас в игру</p>
            <div className="modal-buttons">
              <button className="button-cancel" onClick={() => setShowPreviewModal(false)}>Отмена</button>
              <button className="button-confirm" onClick={() => {
                setShowPreviewModal(false);
                confirmStartGame();
              }}>
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StartScreen;
