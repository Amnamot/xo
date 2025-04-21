const Shape = ({ type }) => (
    <svg
      className="w-full h-full"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      {type === "X" ? (
        <>
          <line
            className="line-x-1"
            x1="10"
            y1="10"
            x2="90"
            y2="90"
            stroke="blue"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <line
            className="line-x-2"
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
          className="circle-o"
          cx="50"
          cy="50"
          r="35"
          stroke="red"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
        />
      )}
      <style>{`
        .line-x-1,
        .line-x-2 {
          stroke-dasharray: 113;
          stroke-dashoffset: 113;
          opacity: 0;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
  
        .line-x-1 {
          animation: draw-x-1 0.25s forwards;
        }
  
        .line-x-2 {
          animation: draw-x-2 0.25s forwards;
          animation-delay: 0.25s;
        }
  
        .circle-o {
          stroke-dasharray: 220;
          stroke-dashoffset: 220;
          animation: draw-o 0.5s linear forwards;
        }
  
        @keyframes draw-x-1 {
          0% {
            stroke-dashoffset: 113;
            opacity: 0;
          }
          1% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }
  
        @keyframes draw-x-2 {
          0% {
            stroke-dashoffset: 113;
            opacity: 0;
          }
          1% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }
  
        @keyframes draw-o {
          from {
            stroke-dashoffset: 220;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </svg>
  );
  
  export default Shape;
  