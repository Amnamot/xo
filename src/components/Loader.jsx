// Loader.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Loader.css";

const APP_VERSION = "1.0.4";

const Loader = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 20); // 100 steps * 20ms = 2000ms = 2s

    const timeout = setTimeout(() => {
      navigate("/start", { replace: true });
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="loader-container">
      <div className="loader-bar">
        <div
          className="loader-fill"
          style={{ height: `${progress}%` }}
        ></div>
      </div>
      <div className="app-version">Version {APP_VERSION}</div>
    </div>
  );
};

export default Loader;
