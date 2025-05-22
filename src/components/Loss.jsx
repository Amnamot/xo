// src/components/Loss.jsx v3
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Loss.css';
import logo from '../media/TiTaTo.svg';
import lossGif from '../media/Loss.gif';

const Loss = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [timeLeft, setTimeLeft] = useState(location.state?.timer || 0);

  useEffect(() => {
    if (location.state?.timer) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate(location.state?.redirectTo || '/start');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [location.state, navigate]);

  const handleClick = () => {
    navigate(location.state?.redirectTo || '/start');
  };

  const renderMessage = () => {
    if (!location.state?.message) {
      return (
        <>
          <div className="losst1">Where am I?</div>
          <div className="losst2">
            Either the battle is over,<br />
            or the link is very old...
          </div>
        </>
      );
    }

    return (
      <div className={location.state.type || "losst2"} 
           dangerouslySetInnerHTML={{ 
             __html: timeLeft > 0 
               ? `${location.state.message} ${timeLeft}s` 
               : location.state.message 
           }} 
      />
    );
  };

  return (
    <div className="loss" onClick={handleClick}>
      <img src={logo} alt="TiTaTo" className="titato" />
      {renderMessage()}
      <img src={lossGif} alt="Lost" className="gif" />
    </div>
  );
};

export default Loss;
