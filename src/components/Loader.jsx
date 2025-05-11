// src/components/Loader.jsx v5

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WebApp } from '@twa-dev/sdk';
import { upsertUser } from '../api';
import { getUserFromInitData } from '../utils';

const Loader = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const initData = WebApp.initData;
      const user = getUserFromInitData(initData);
      await upsertUser(user);

      const params = new URLSearchParams(window.location.search);
      const lobbyId = params.get('startapp');

      if (lobbyId) {
        try {
          const res = await fetch(`/lobby/join?lobbyId=${lobbyId}`);
          const data = await res.json();

          if (data.status === 'creator') {
            navigate('/wait');
          } else if (data.status === 'joined') {
            navigate('/game');
          } else if (data.status === 'not_found') {
            navigate('/nolobby');
          } else {
            navigate('/loss');
          }
        } catch (e) {
          navigate('/loss');
        }
      } else {
        navigate('/start');
      }
    };

    init();
  }, [navigate]);

  return null;
};

export default Loader;
