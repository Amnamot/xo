import React, { useEffect, useState } from 'react';
import './StartScreen.css';
import logo from './media/3tICO.svg';

const StartScreen = ({ onStart }) => {
  const [user, setUser] = useState({
    firstName: '',
    lastName: '',
    avatar: '',
    numGames: 0,
    numWins: 0,
  });

  useEffect(() => {
    const telegram = window.Telegram?.WebApp;
    const initDataUnsafe = telegram?.initDataUnsafe;
    const tgUser = initDataUnsafe?.user;

    if (tgUser) {
      const { first_name, last_name, photo_url, id } = tgUser;
      fetch(`/api/user/${id}`)
        .then(res => res.json())
        .then(data => {
          setUser({
            firstName: first_name,
            lastName: last_name,
            avatar: photo_url,
            numGames: data.numGames || 0,
            numWins: data.numWins || 0,
          });
        });
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
        <button
          className="button1"
          style={{ marginBottom: 36 }}
          onClick={onStart}
        >
          Start
        </button>
      </div>
    </div>
  );
};

export default StartScreen;
