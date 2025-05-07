// src/components/Loss.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Loss.css';
import logo from '../media/TiTaTo.svg';
import lossGif from '../media/Loss.gif';

const Loss = () => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/start');
  };

  return (
    <div className="loss" onClick={handleClick}>
      <img src={logo} alt="TiTaTo" className="titato" />
      <div className="losst1">Where am I?</div>
      <div className="losst2">
        Either the battle is over,<br />
        or the link is very old...
      </div>
      <img src={lossGif} alt="Lost" className="gif" />
    </div>
  );
};

export default Loss;
