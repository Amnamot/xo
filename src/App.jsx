// src/App.jsx v3
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Loader from "./components/Loader";
import StartScreen from "./StartScreen";
import Game from "./Game";
import EndGame from "./components/EndGame";
import LostGame from "./components/LostGame";
import Loss from "./components/Loss";
import { SocketProvider } from './contexts/SocketContext';

const App = () => {
  const [telegramId, setTelegramId] = useState(null);

  // Функция для получения актуального telegramId
  const getCurrentTelegramId = () => {
    return localStorage.getItem('current_telegram_id') || 'unknown';
  };

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

    // Инициализируем telegramId из localStorage
    setTelegramId(getCurrentTelegramId());
    
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

    // Следим за изменениями в localStorage
    const handleStorageChange = (e) => {
      if (e.key === 'current_telegram_id') {
        setTelegramId(e.newValue || 'unknown');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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
          <Route path="/game" element={<Game />} /> {/* Для создателя лобби */}
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
