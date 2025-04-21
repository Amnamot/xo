import React, { useState, useRef, useEffect } from "react";
import Shape from "./Shape"; // Импорт компонента

const BOARD_SIZE = 100;
const WIN_CONDITION = 5;
const INITIAL_POSITION = Math.floor(BOARD_SIZE / 2);
const CELL_SIZE = 60;

const createEmptyBoard = () =>
  Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

const checkWinner = (board, row, col, player) => {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (const [dx, dy] of directions) {
    let count = 1;
    for (let step = 1; step < WIN_CONDITION; step++) {
      const x = row + dx * step;
      const y = col + dy * step;
      if (board[x]?.[y] === player) count++;
      else break;
    }
    for (let step = 1; step < WIN_CONDITION; step++) {
      const x = row - dx * step;
      const y = col - dy * step;
      if (board[x]?.[y] === player) count++;
      else break;
    }
    if (count >= WIN_CONDITION) return player;
  }
  return null;
};

const getVisibleCells = (board) => {
  const visibleCells = new Set();
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col]) {
        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -2; dy <= 2; dy++) {
            const x = row + dx;
            const y = col + dy;
            if (board[x]?.[y] === null) {
              visibleCells.add(`${x}-${y}`);
            }
          }
        }
      }
    }
  }
  return visibleCells;
};

export default function App() {
  const [board, setBoard] = useState(() => {
    const newBoard = createEmptyBoard();
    newBoard[INITIAL_POSITION][INITIAL_POSITION] = "X";
    return newBoard;
  });
  const [currentPlayer, setCurrentPlayer] = useState("O");
  const [winner, setWinner] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const boardRef = useRef(null);

  useEffect(() => {
    if (boardRef.current) {
      boardRef.current.style.transform = `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`;
    }
  }, [position, scale]);

  const handleMouseDown = (e) => {
    setIsPanning(true);
    setStartPan({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPosition({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    setScale((prev) => Math.min(Math.max(prev - e.deltaY * 0.001, 0.5), 2));
  };

  const visibleCells = getVisibleCells(board);

  const handleClick = (row, col) => {
    if (!visibleCells.has(`${row}-${col}`) || winner) return;
    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = currentPlayer;
    setBoard(newBoard);

    if (checkWinner(newBoard, row, col, currentPlayer)) {
      setWinner(currentPlayer);
    } else {
      setCurrentPlayer(currentPlayer === "X" ? "O" : "X");
    }
  };

  return (
    <div
      className="flex flex-col items-center p-4 overflow-hidden h-screen w-screen relative"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      <h1 className="text-2xl font-bold mb-4">Infinite Tic-Tac-Toe</h1>
      <div
        ref={boardRef}
        className="grid absolute top-1/2 left-1/2"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
        }}
      >
        {board.map((row, i) =>
          row.map((cell, j) => (
            <button
              key={`${i}-${j}`}
              className={`w-[${CELL_SIZE}px] h-[${CELL_SIZE}px] border border-gray-500 flex items-center justify-center ${
                visibleCells.has(`${i}-${j}`) ? "bg-gray-200" : "bg-gray-500"
              }`}
              onClick={() => handleClick(i, j)}
              disabled={!visibleCells.has(`${i}-${j}`)}
            >
              {cell && <Shape type={cell} />}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
