import React, { useEffect, useRef, useState } from "react";
import "./WinEffect.css";  // Подключаем стили

const getRandom = (min, max) => {
  return Math.random() * (max - min) + min;
};

const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min)) + min;
};

const getRandomColor = () => {
  const colors = [
    'rgba(231, 76, 60, 1)', // red
    'rgba(241, 196, 15, 1)', // yellow
    'rgba(46, 204, 113, 1)', // green
    'rgba(52, 152, 219, 1)', // blue
    'rgba(155, 89, 182, 1)'  // purple
  ];

  return colors[getRandomInt(0, colors.length)];
};

// Canvas animation component
const WinEffect = () => {
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Calculate the correct size for the canvas
  useEffect(() => {
    const updateCanvasSize = () => {
      setCanvasSize({ width: window.innerWidth, height: window.innerHeight }); // Set canvas to fill the entire screen
    };

    updateCanvasSize(); // Initial size calculation
    window.addEventListener("resize", updateCanvasSize); // Update on window resize

    return () => window.removeEventListener("resize", updateCanvasSize); // Clean up on unmount
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;  // If canvas is not found, return

    const ctx = canvas.getContext("2d");

    const particles = [];
    const particleCount = 50;

    // Particle class
    class Particle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.color = getRandomColor();
        this.life = 1;
        this.aging = getRandom(0.99, 0.999); // Random aging speed
        this.r = getRandomInt(8, 16);
        this.speed = getRandom(3, 8);
        this.velocity = [getRandom(-this.speed, this.speed), getRandom(-this.speed, this.speed)];
      }

      update() {
        this.life *= this.aging;

        if (
          this.r < 0.1 ||
          this.life === 0 ||
          this.x + this.r < 0 ||
          this.x - this.r > canvas.width ||
          this.y + this.r < 0 ||
          this.y - this.r > canvas.height
        ) {
          particles.splice(particles.indexOf(this), 1);
        }

        this.r *= this.life;
        this.x += this.velocity[0];
        this.y += this.velocity[1];
      }

      render() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.closePath();

        const r = this.color.match(/([0-9]+)/g)[0];
        const g = this.color.match(/([0-9]+)/g)[1];
        const b = this.color.match(/([0-9]+)/g)[2];

        // Gradient
        const spread = 1.5;
        const gradient = ctx.createRadialGradient(this.x, this.y, this.r, this.x, this.y, this.r * spread);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.3)`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r * spread, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.closePath();
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // Generate particles randomly
    const generateParticles = () => {
      const x = getRandom(0, canvas.width);
      const y = getRandom(0, canvas.height);
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(x, y));
      }
    };

    // Update and render particles
    const updateParticles = () => {
      particles.forEach((particle) => {
        particle.update();
        particle.render();
      });
    };

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      updateParticles();
      requestAnimationFrame(animate);
    };

    // Generate particles with a random interval
    const generateWithRandomInterval = () => {
      const randomInterval = getRandom(10, 300); // Random interval between 100ms and 800ms
      generateParticles(); // Generate particles
      setTimeout(generateWithRandomInterval, randomInterval); // Recursively call itself with new random interval
    };

    generateWithRandomInterval(); // Start the particle generation

    animate(); // Start the animation loop

  }, [canvasSize]);

  return (
    <canvas
      ref={canvasRef}
      className="win-effect-canvas"
      width={canvasSize.width}
      height={canvasSize.height}
    ></canvas>
  );
};

export default WinEffect;
