// App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Loader from "./components/Loader";
import StartScreen from "./StartScreen";
import Game from "./Game";
import EndGame from "./components/EndGame";
import LostGame from "./components/LostGame";

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Стартовый экран при загрузке приложения */}
        <Route path="/" element={<Loader />} />

        {/* Экран после загрузки */}
        <Route path="/start" element={<StartScreen />} />

        {/* Игровой экран */}
        <Route path="/game" element={<Game />} />

        {/* Экран победителя */}
        <Route path="/end" element={<EndGame />} />

        {/* Экран проигравшего */}
        <Route path="/lost" element={<LostGame />} />
      </Routes>
    </Router>
  );
};

export default App;
