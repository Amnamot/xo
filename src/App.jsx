// src/App.jsx v3
import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Loader from "./components/Loader";
import StartScreen from "./StartScreen";
import Game from "./Game";
import EndGame from "./components/EndGame";
import LostGame from "./components/LostGame";
import Loss from "./components/Loss";
import { SocketProvider } from './contexts/SocketContext';

const App = () => {
  useEffect(() => {
    // Инициализируем Telegram WebApp первым
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      console.log('✅ [App] Telegram WebApp initialized:', {
        hasWebApp: Boolean(window.Telegram?.WebApp),
        hasInitDataUnsafe: Boolean(window.Telegram?.WebApp?.initDataUnsafe),
        startParam: window.Telegram?.WebApp?.initDataUnsafe?.start_param,
        timestamp: new Date().toISOString()
      });
    }

    // Отслеживаем изменения состояния приложения
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.onEvent('viewportChanged', async () => {
        const isExpanded = window.Telegram.WebApp.isExpanded;
        
        if (!isExpanded) {
          // При сворачивании приложения
          // emitUiState и socket-логику теперь реализуем через контекст
        } else {
          // При разворачивании приложения
          // emitUiState и socket-логику теперь реализуем через контекст
        }
      });
    }
  }, []);

  return (
    <SocketProvider>
      <Router>
        <Routes>
          {/* Стартовый экран при загрузке приложения */}
          <Route path="/" element={<Loader />} />

          {/* Экран после загрузки */}
          <Route path="/start" element={<StartScreen />} />

          {/* Игровой экран */}
          <Route path="/game" element={<Game lobbyId={null} />} /> {/* Для создателя лобби */}
          <Route path="/game/:lobbyId" element={<Game />} /> {/* Для присоединяющегося игрока */}

          {/* Экран победителя */}
          <Route path="/end" element={<EndGame />} />

          {/* Экран проигравшего */}
          <Route path="/lost" element={<LostGame />} />

          {/* Экран потерянного лобби */}
          <Route path="/nolobby" element={<Loss />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
};

export default App;
