import React, { useEffect, useState } from "react";
import "./GameHeader.css";

const GameHeader = () => {
  const [user, setUser] = useState({
    avagamer1: "/media/defAva.png",
    avagamer2: "/media/buddha.svg",
    firstName1: "John",
    firstName2: "Marina",
  });

  const [time, setTime] = useState(0); // таймер в минутах и секундах
  const [timer, setTimer] = useState(1200); // 20 минут

  useEffect(() => {
    console.log("GameHeader rendered");
    // здесь можно добавить логику для обновления времени или состояния
    const interval = setInterval(() => {
      setTimer((prevTimer) => prevTimer - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const formatTimer = (timer) => {
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    return `${minutes}:${seconds}`;
  };

  return (
    <>
      <div className="top-logo">
        <img src="/media/3tICO.svg" width={128} alt="Logo" />
      </div>

      <div className="gameplayers">
        <div className="gamer1">
          <img className="avagamer1" src={user.avagamer1} alt="Player 1" />
          <div className="namegamer1">{user.firstName1}</div>
        </div>

        <div className="times">
          <div className="time">{formatTime(time)}</div>
          <div className="timer">{formatTimer(timer)}</div>
        </div>

        <div className="gamer2">
          <img className="avagamer2" src={user.avagamer2} alt="Player 2" />
          <div className="namegamer2">{user.firstName2}</div>
        </div>
      </div>
    </>
  );
};

export default GameHeader;
