import React, { useState, useRef, useEffect } from "react";

export const WinLine = ({ start, end, cellSize }) => {
  const x1 = start[1] * cellSize + cellSize / 2;
  const y1 = start[0] * cellSize + cellSize / 2;
  const x2 = end[1] * cellSize + cellSize / 2;
  const y2 = end[0] * cellSize + cellSize / 2;

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none"
      width="100%"
      height="100%"
    >
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="rgb(17, 196, 30)"
        strokeWidth="12"
        strokeLinecap="round"
        className="win-line"
      />
      <style>{`
        .win-line {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: draw-win 0.5s linear forwards;
        }
        @keyframes draw-win {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </svg>
  );
};

const Shape = ({ type }) => (
  <svg
    className="w-full h-full"
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
  >
    {type === "X" ? (
      <>
        <line
          className="draw-line-1"
          x1="10"
          y1="10"
          x2="90"
          y2="90"
          stroke="blue"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <line
          className="draw-line-2"
          x1="90"
          y1="10"
          x2="10"
          y2="90"
          stroke="blue"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </>
    ) : (
      <circle
        className="draw-circle"
        cx="50"
        cy="50"
        r="35"
        stroke="red"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
      />
    )}
    <style>{`
      .draw-line-1 {
        stroke-dasharray: 113;
        stroke-dashoffset: 113;
        animation: draw-line-1 0.25s linear forwards;
      }

      .draw-line-2 {
        stroke-dasharray: 113;
        stroke-dashoffset: 113;
        animation: draw-line-2 0.25s linear forwards;
        animation-delay: 0.25s;
      }

      .draw-circle {
        stroke-dasharray: 220;
        stroke-dashoffset: 220;
        animation: draw 0.5s linear forwards;
      }

      @keyframes draw-line-1 {
        to {
          stroke-dashoffset: 0;
        }
      }

      @keyframes draw-line-2 {
        to {
          stroke-dashoffset: 0;
        }
      }

      @keyframes draw {
        to {
          stroke-dashoffset: 0;
        }
      }
    `}</style>
  </svg>
);

export default Shape;
