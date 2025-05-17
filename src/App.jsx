// src/App.jsx v3
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Loader from "./components/Loader";
import StartScreen from "./StartScreen";
import Game from "./Game";
import EndGame from "./components/EndGame";
import LostGame from "./components/LostGame";
import Loss from "./components/Loss";
import { initSocket, connectSocket } from './services/socket';

const App = () => {
  const [telegramId, setTelegramId] = useState(null);

  // Функция для получения актуального telegramId
  const getCurrentTelegramId = () => {
    return localStorage.getItem('current_telegram_id') || 'unknown';
  };

  useEffect(() => {
    // Инициализируем telegramId из localStorage
    setTelegramId(getCurrentTelegramId());

    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      
      // Отслеживаем изменения состояния приложения
      window.Telegram.WebApp.onEvent('viewportChanged', async () => {
        const isExpanded = window.Telegram.WebApp.isExpanded;
        await connectSocket();
        const socket = initSocket();
        
        if (!isExpanded) {
          // При сворачивании приложения
          socket.emit('uiState', { 
            state: 'minimized', 
            telegramId: getCurrentTelegramId(),
            details: { 
              lastScreen: window.location.pathname,
              timestamp: Date.now()
            }
          });
        } else {
          // При разворачивании приложения
          try {
            const gameState = await checkAndRestoreGameState(getCurrentTelegramId());
            if (gameState?.gameId) {
              console.log('🔄 [App] Restoring game after expand:', {
                gameId: gameState.gameId,
                timestamp: new Date().toISOString()
              });
              window.location.href = `/game/${gameState.gameId}`;
            }
          } catch (error) {
            console.warn('⚠️ [App] No active game found after expand:', {
              error: error.message,
              timestamp: new Date().toISOString()
            });
          }
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

  // Функция для отправки состояния UI
  const emitUiState = (state, details = {}) => {
    const socket = initSocket();
    socket.emit('uiState', {
      state,
      telegramId: getCurrentTelegramId(),
      details
    });
  };

  return (
    <Router>
      <Routes>
        {/* Стартовый экран при загрузке приложения */}
        <Route path="/" element={<Loader onMount={() => emitUiState('loader', { progress: 0 })} />} />

        {/* Экран после загрузки */}
        <Route path="/start" element={<StartScreen onMount={() => emitUiState('startScreen')} />} />

        {/* Игровой экран */}
        <Route path="/game" element={<Game />} /> {/* Для создателя лобби */}
        <Route path="/game/:lobbyId" element={<Game />} /> {/* Для присоединяющегося игрока */}

        {/* Экран победителя */}
        <Route path="/end" element={<EndGame />} />

        {/* Экран проигравшего */}
        <Route path="/lost" element={<LostGame />} />

        {/* Экран потерянного лобби */}
        <Route path="/nolobby" element={<Loss onMount={() => emitUiState('loss')} />} />
      </Routes>
    </Router>
  );
};

export default App;
