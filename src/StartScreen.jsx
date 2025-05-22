// src/StartScreen.jsx v14
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./StartScreen.css";
import { initSocket } from "./services/socket";
import WaitModal from "./components/WaitModal";

const StartScreen = () => {
  const navigate = useNavigate();
  const [showWaitModal, setShowWaitModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const socket = initSocket();
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();

    if (!telegramId) {
      console.warn('⚠️ [StartScreen] No telegramId found');
      return;
    }

    socket.on('gameStart', (data) => {
      console.log('🎮 [StartScreen] Received gameStart event:', {
        session: data?.session,
        telegramId,
        socketId: socket.id,
        connected: socket.connected,
        rooms: Array.from(socket.rooms || []),
        hasGameStartListener: socket.listeners('gameStart').length,
        timestamp: new Date().toISOString()
      });

      if (data && data.session && data.session.id) {
        console.log('🎯 [StartScreen] Navigating to game:', {
          gameId: data.session.id,
          telegramId,
          socketState: {
            connected: socket.connected,
            rooms: Array.from(socket.rooms || []),
            listeners: {
              gameStart: socket.listeners('gameStart').length,
              lobbyReady: socket.listeners('lobbyReady').length,
              setShowWaitModal: socket.listeners('setShowWaitModal').length
            }
          },
          timestamp: new Date().toISOString()
        });
        setShowWaitModal(false);
        navigate(`/game/${data.session.id}`);
      } else {
        console.warn('⚠️ [StartScreen] Invalid gameStart data:', {
          data,
          telegramId,
          socketState: {
            connected: socket.connected,
            rooms: Array.from(socket.rooms || [])
          },
          timestamp: new Date().toISOString()
        });
      }
    });

    return () => {
      socket.off('gameStart');
    };
  }, [navigate]);

  const handleCreateLobby = async () => {
    setIsLoading(true);
    try {
      const socket = initSocket();
      const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();

      if (!telegramId) {
        throw new Error('No telegramId found');
      }

      socket.emit('createLobby', { telegramId }, (response) => {
        if (response && !response.error) {
          setShowWaitModal(true);
        } else {
          console.error('Failed to create lobby:', response?.error);
        }
        setIsLoading(false);
      });
    } catch (error) {
      console.error('Error creating lobby:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="start-screen">
      <h1>XO Game</h1>
      <button 
        onClick={handleCreateLobby}
        disabled={isLoading}
      >
        {isLoading ? 'Creating...' : 'Create Game'}
      </button>
      {showWaitModal && (
        <WaitModal 
          onClose={() => setShowWaitModal(false)}
        />
      )}
    </div>
  );
};

export default StartScreen;
