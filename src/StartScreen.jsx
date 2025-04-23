import React, { useEffect, useState } from 'react';
import './StartScreen.css';
import logo from './media/3tICO.svg';

const StartScreen = () => {
  const [user, setUser] = useState({
    firstName: '',
    lastName: '',
    avatar: '',
    numGames: 0,
    numWins: 0,
  });

  useEffect(() => {
    const telegram = window.Telegram?.WebApp;
    const initData = telegram?.initData || '';

    if (initData) {
      fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ initData }),
      })
        .then((res) => res.json())
        .then((data) => {
          setUser({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            avatar: telegram.initDataUnsafe?.user?.photo_url || '',
            numGames: data.numGames || 0,
            numWins: data.numWins || 0,
          });
        })
        .catch((err) => console.error('Auth error:', err));
    }
  }, []);

  const screenWidth = window.innerWidth;
  const containerWidth = (screenWidth / 12) * 10;
  const avatarSize = screenWidth / 2.5;

  return (
    <div className="start-screen">
      <div className="top-logo" style={{ marginTop: 30 }}>
        <img src={logo} width={128} alt="Logo" />
      </div>

      <div className="user-block" style={{ width: containerWidth }}>
        <img
          className="ava1"
          src={user.avatar}
          alt="avatar"
          style={{ width: avatarSize, borderRadius: 8 }}
        />
        <div className="title1" style={{ marginTop: 12 }}>Hello</div>
        <div className="name1" style={{ marginTop: 9 }}>{user.firstName} {user.lastName}</div>
        <div className="stata1" style={{ marginTop: 24 }}>
          You played {user.numGames} games<br />
          You won {user.numWins} times
        </div>
      </div>

      <div className="bottom-block" style={{ width: containerWidth }}>
        <div className="call1" style={{ marginBottom: 12 }}>
          To start the game by inviting an opponent, just click on this button
        </div>
        <button className="button1" style={{ marginBottom: 36 }}>Start</button>
      </div>
    </div>
  );
};

export default StartScreen;
