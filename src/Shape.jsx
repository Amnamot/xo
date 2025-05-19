// Shape.jsx
import React from "react";

// Компонент для отображения фигур (крестик или нолик)
const Shape = ({ type }) => {
  // Если тип фигуры "X" - рисуем крестик через SVG двумя диагональными линиями
  if (type === "X") {
    return (
      <svg className="cross" viewBox="0 0 100 100">
        {/* Первая диагональная линия: слева сверху направо вниз */}
        <line className="cross-line-1" x1="10" y1="10" x2="90" y2="90" />
        {/* Вторая диагональная линия: справа сверху налево вниз */}
        <line className="cross-line-2" x1="90" y1="10" x2="10" y2="90" />
      </svg>
    );
  }

  // Если тип фигуры "O" - рисуем нолик через SVG
  if (type === "O") {
    return (
      <svg className="circle" viewBox="0 0 100 100">
        <circle className="circle-shape" cx="50" cy="50" r="40" />
      </svg>
    );
  }

  // Если тип фигуры неизвестен - ничего не отображаем
  return null;
};

export default Shape;
