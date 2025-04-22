import React from "react";

export default function Shape({ type }) {
  return (
    <svg
      className="w-full h-full"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      {type === "X" ? (
        <>
          <line
            x1="10"
            y1="10"
            x2="90"
            y2="90"
            stroke="blue"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="113"
            strokeDashoffset="113"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="113"
              to="0"
              dur="0.25s"
              fill="freeze"
            />
          </line>
          <line
            x1="90"
            y1="10"
            x2="10"
            y2="90"
            stroke="blue"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="113"
            strokeDashoffset="113"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="113"
              to="0"
              dur="0.25s"
              begin="0.25s"
              fill="freeze"
            />
          </line>
        </>
      ) : (
        <circle
          cx="50"
          cy="50"
          r="35"
          stroke="red"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="220"
          strokeDashoffset="220"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="220"
            to="0"
            dur="0.5s"
            fill="freeze"
          />
        </circle>
      )}
    </svg>
  );
}

export function WinLine({ start, end, cellSize }) {
  const x1 = start[1] * cellSize + cellSize / 2;
  const y1 = start[0] * cellSize + cellSize / 2;
  const x2 = end[1] * cellSize + cellSize / 2;
  const y2 = end[0] * cellSize + cellSize / 2;

  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
      <line
        x1={x1}
        y1={y1}
        x2={x1}
        y2={y1}
        stroke="rgb(17,196,30)"
        strokeWidth="12"
        strokeLinecap="round"
      >
        <animate
          attributeName="x2"
          from={x1}
          to={x2}
          dur="0.5s"
          fill="freeze"
        />
        <animate
          attributeName="y2"
          from={y1}
          to={y2}
          dur="0.5s"
          fill="freeze"
        />
      </line>
    </svg>
  );
}
