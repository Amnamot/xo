// TopUpModal.jsx (обновлённый)
import React, { useState } from "react";
import "./TopUpModal.css";

const TopUpModal = ({ onClose }) => {
  const [selectedAmount, setSelectedAmount] = useState(null);

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('topup-modal-overlay')) {
      onClose();
    }
  };

  const handleSelect = (amount) => {
    setSelectedAmount(amount);
  };

  return (
    <div className="topup-modal-overlay" onClick={handleOverlayClick}>
      <div className="topup-modal-container">
        <img src="/media/TGstar.svg" alt="Star" className="topup-modal-star" />

        <div className="topup-modal-transfer-text">
          Transfer <b>Telegram Stars</b> to balance
        </div>

        <div className="topup-modal-buttons">
          {[50, 100, 300, 500].map((amount) => (
            <button
              key={amount}
              className={`topup-modal-button ${selectedAmount === amount ? "active" : ""}`}
              onClick={() => handleSelect(amount)}
            >
              {amount}
            </button>
          ))}
        </div>

        <button
          className={`topup-modal-transfer-button ${selectedAmount ? "active" : ""}`}
          disabled={!selectedAmount}
        >
          <img src="/media/TGstar.svg" alt="star" className="topup-modal-star-icon" />
          Transfer
          <img src="/media/TGstar.svg" alt="star" className="topup-modal-star-icon" />
        </button>
      </div>
    </div>
  );
};

export default TopUpModal;