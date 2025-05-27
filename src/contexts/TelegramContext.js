import React, { createContext, useContext, useState, useEffect } from 'react';

const TelegramContext = createContext();

export const useTelegram = () => {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
};

export const TelegramProvider = ({ children }) => {
  const [telegramId, setTelegramId] = useState(null);

  useEffect(() => {
    // Получаем ID пользователя из Telegram WebApp
    const initData = window.Telegram?.WebApp?.initDataUnsafe;
    if (initData?.user?.id) {
      setTelegramId(initData.user.id.toString());
    }
  }, []);

  return (
    <TelegramContext.Provider value={{ telegramId }}>
      {children}
    </TelegramContext.Provider>
  );
}; 