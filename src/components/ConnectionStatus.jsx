import React, { useState, useEffect } from 'react';
import './ConnectionStatus.css';

const ConnectionStatus = () => {
  const [status, setStatus] = useState('connected');
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleConnected = () => {
      setStatus('connected');
      setMessage('');
      
      // Скрываем уведомление через 3 секунды при успешном подключении
      setTimeout(() => setVisible(false), 3000);
    };

    const handleDisconnected = (event) => {
      setStatus('disconnected');
      setMessage(`Соединение потеряно: ${event.detail.reason}`);
      setVisible(true);
    };

    const handleError = (event) => {
      setStatus('error');
      setMessage(`Ошибка соединения: ${event.detail.error}`);
      setVisible(true);
    };

    const handleMaxAttempts = () => {
      setStatus('max_attempts');
      setMessage('Не удалось восстановить соединение. Пожалуйста, обновите страницу.');
      setVisible(true);
    };

    // Подписываемся на события
    window.addEventListener('websocket_connected', handleConnected);
    window.addEventListener('websocket_disconnected', handleDisconnected);
    window.addEventListener('websocket_error', handleError);
    window.addEventListener('websocket_max_attempts', handleMaxAttempts);

    // Отписываемся при размонтировании
    return () => {
      window.removeEventListener('websocket_connected', handleConnected);
      window.removeEventListener('websocket_disconnected', handleDisconnected);
      window.removeEventListener('websocket_error', handleError);
      window.removeEventListener('websocket_max_attempts', handleMaxAttempts);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`connection-status ${status}`}>
      <div className="connection-message">
        {message}
        {status === 'max_attempts' && (
          <button onClick={() => window.location.reload()}>
            Обновить страницу
          </button>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus; 