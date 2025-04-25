// src/App.jsx
import React, { useState } from 'react';
import StartScreen from './StartScreen';
import Game from './Game';

function App() {
  const [screen, setScreen] = useState('start'); // 'start' | 'game'

  const goToGame = () => setScreen('game');
  const goToStart = () => setScreen('start');

  return (
    <>
      {screen === 'start' && <StartScreen onStart={goToGame} />}
      {screen === 'game' && <Game onBack={goToStart} />}
    </>
  );
}

export default App;
