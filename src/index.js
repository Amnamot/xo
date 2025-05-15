import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Глобальный обработчик ошибок
window.onerror = function(message, source, lineno, colno, error) {
  console.error('🔥 Global error:', {
    message,
    source,
    lineno,
    colno,
    error: error?.stack,
    timestamp: new Date().toISOString()
  });
  return false;
};

// Отслеживание состояния загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM fully loaded', {
    timestamp: new Date().toISOString(),
    telegramWebApp: !!window.Telegram?.WebApp,
    initData: window.Telegram?.WebApp?.initData ? 'present' : 'missing',
    viewportHeight: window.innerHeight,
    viewportWidth: window.innerWidth,
    userAgent: navigator.userAgent
  });
});

// Функция для инициализации Telegram Web App
const initTelegramApp = () => {
  console.log('🚀 Starting Telegram WebApp initialization', {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    telegramWebApp: !!window.Telegram?.WebApp,
    initData: window.Telegram?.WebApp?.initData ? 'present' : 'missing'
  });

  return new Promise((resolve) => {
    if (window.Telegram?.WebApp) {
      console.log('📱 Telegram WebApp already initialized', {
        timestamp: new Date().toISOString(),
        version: window.Telegram.WebApp.version,
        platform: window.Telegram.WebApp.platform,
        colorScheme: window.Telegram.WebApp.colorScheme,
        themeParams: window.Telegram.WebApp.themeParams,
        viewportHeight: window.Telegram.WebApp.viewportHeight,
        viewportStableHeight: window.Telegram.WebApp.viewportStableHeight
      });
      
      // Важно: даем небольшую задержку даже если WebApp уже инициализирован
      setTimeout(resolve, 100);
      return;
    }

    const maxAttempts = 50;
    let attempts = 0;

    const checkTelegram = () => {
      if (window.Telegram?.WebApp) {
        console.log('📱 Telegram WebApp initialized after attempts:', {
          attempts,
          timestamp: new Date().toISOString(),
          version: window.Telegram.WebApp.version,
          platform: window.Telegram.WebApp.platform,
          colorScheme: window.Telegram.WebApp.colorScheme,
          themeParams: window.Telegram.WebApp.themeParams,
          viewportHeight: window.Telegram.WebApp.viewportHeight,
          viewportStableHeight: window.Telegram.WebApp.viewportStableHeight
        });
        
        // Важно: даем дополнительное время на полную инициализацию
        setTimeout(resolve, 100);
        return;
      }

      if (attempts >= maxAttempts) {
        console.warn('⚠️ Failed to initialize Telegram WebApp', {
          attempts,
          timestamp: new Date().toISOString(),
          telegramObject: !!window.Telegram,
          webAppObject: !!window.Telegram?.WebApp
        });
        resolve();
        return;
      }

      attempts++;
      setTimeout(checkTelegram, 100);
    };

    checkTelegram();
  });
};

// Инициализируем приложение только после готовности Telegram Web App
const startApp = async () => {
  console.time('⏱️ App Initialization');
  
  try {
    // Ждем инициализации Telegram Web App
    await initTelegramApp();
    
    // Даем дополнительное время на полную инициализацию всех компонентов
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('🎯 Starting React initialization', {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      telegramWebApp: {
        initialized: !!window.Telegram?.WebApp,
        platform: window.Telegram?.WebApp?.platform,
        version: window.Telegram?.WebApp?.version
      }
    });

    const root = ReactDOM.createRoot(document.getElementById("root"));
    
    // В production используем React.Fragment вместо StrictMode
    const AppWrapper = process.env.NODE_ENV === 'development' ? React.StrictMode : React.Fragment;
    
    root.render(
      <AppWrapper>
        <App />
      </AppWrapper>
    );

    console.log('✅ React app rendered', {
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Critical error during app initialization:', {
      error: error?.stack,
      timestamp: new Date().toISOString()
    });
  } finally {
    console.timeEnd('⏱️ App Initialization');
  }
};

// Запускаем приложение только после полной загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
