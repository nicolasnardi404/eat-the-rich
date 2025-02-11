'use client';

import { useEffect, useRef, useState } from 'react';

interface FallingObject {
  id: number;
  x: number;
  y: number;
  type: 'trump' | 'elon';
  isDragging: boolean;
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [objects, setObjects] = useState<FallingObject[]>([]);
  const [draggedObject, setDraggedObject] = useState<FallingObject | null>(null);
  const [isDinoOpen, setIsDinoOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>('start');
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [spawnInterval, setSpawnInterval] = useState(800);
  const [dino, setDino] = useState<DinoState>({
    x: 350,
    y: 500,
    isJumping: false,
    velocity: 0
  });
  
  // Adjust these constants for better jump physics
  const DINO_SPEED = 12;
  const JUMP_FORCE = -20;
  const GRAVITY = 1.2;
  const GROUND_Y = 500;
  const CANVAS_HEIGHT = 600;
  const FALL_SPEED = 4; // New constant for falling speed

  // Add a ref to track the mouth closing timeout
  const mouthTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add a ref for the animation frame
  const animationFrameRef = useRef<number>();
  const gameLoopIntervalRef = useRef<NodeJS.Timeout>();

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLives(3);
    setObjects([]);
    setLevel(1);
    setSpawnInterval(800);
    spawnNewObject(); // Immediately spawn first object when game starts
  };

  // Add keyboard controls effect
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft':
          setDino(prev => ({
            ...prev,
            x: Math.max(0, prev.x - DINO_SPEED)
          }));
          break;
        case 'ArrowRight':
          setDino(prev => ({
            ...prev,
            x: Math.min(700, prev.x + DINO_SPEED)
          }));
          break;
        case 'Space':
          handleJump();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, dino.isJumping]);

  // Spawn new object function
  const spawnNewObject = () => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== 'playing') return;

    const newObject: FallingObject = {
      id: Date.now(),
      x: Math.random() * (canvas.width - 50), // Random x position
      y: -50, // Start above the canvas
      type: Math.random() > 0.5 ? 'trump' : 'elon',
      isDragging: false
    };
    setObjects(prev => [...prev, newObject]);
  };

  // Add collision detection helper function
  const checkCollision = (dino: DinoState, obj: FallingObject) => {
    // Define collision box for dino and falling object
    const dinoBox = {
      x: dino.x + 20, // Adjust hitbox to match dino's mouth
      y: dino.y + 20,
      width: 60,
      height: 60
    };

    const objBox = {
      x: obj.x,
      y: obj.y,
      width: 50,
      height: 50
    };

    return (
      dinoBox.x < objBox.x + objBox.width &&
      dinoBox.x + dinoBox.width > objBox.x &&
      dinoBox.y < objBox.y + objBox.height &&
      dinoBox.y + dinoBox.height > objBox.y
    );
  };

  // Update game loop effect to include collision detection
  useEffect(() => {
    if (gameState === 'playing') {
      const gameLoop = setInterval(() => {
        // Update falling objects with collision detection
        setObjects((prevObjects) => {
          return prevObjects.map((obj) => ({
            ...obj,
            y: obj.y + FALL_SPEED,
          })).filter((obj) => {
            // Check if object hits dino
            if (checkCollision(dino, obj)) {
              setScore(prev => prev + 10); // Add points for catching
              setIsDinoOpen(true); // Open mouth when eating
              // Close mouth after a short delay
              if (mouthTimeoutRef.current) {
                clearTimeout(mouthTimeoutRef.current);
              }
              mouthTimeoutRef.current = setTimeout(() => {
                setIsDinoOpen(false);
              }, 200);
              return false; // Remove eaten object
            }
            // Check if object falls off screen
            if (obj.y >= CANVAS_HEIGHT) {
              setLives(prev => prev - 1); // Lose a life when missing
              if (lives <= 1) {
                setGameState('gameOver');
              }
              return false;
            }
            return true;
          });
        });

        // Update dino physics
        setDino(prev => {
          if (!prev.isJumping) return prev;
          
          const newVelocity = prev.velocity + GRAVITY;
          const newY = prev.y + newVelocity;

          // Check ground collision
          if (newY >= GROUND_Y) {
            return {
              ...prev,
              y: GROUND_Y,
              isJumping: false,
              velocity: 0
            };
          }

          return {
            ...prev,
            y: newY,
            velocity: newVelocity
          };
        });
      }, 16);

      return () => clearInterval(gameLoop);
    }
  }, [gameState, dino, lives]);

  // Spawn timer effect - separate from game loop
  useEffect(() => {
    if (gameState === 'playing') {
      // Initial spawn
      spawnNewObject();
      
      // Regular spawn interval
      const spawnTimer = setInterval(() => {
        spawnNewObject();
      }, spawnInterval);

      return () => clearInterval(spawnTimer);
    }
  }, [gameState, spawnInterval]);

  // Add continuous movement for smoother controls
  useEffect(() => {
    if (gameState !== 'playing') return;

    const keysPressed = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.add(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
    };

    const moveInterval = setInterval(() => {
      if (keysPressed.has('ArrowLeft')) {
        setDino(prev => ({
          ...prev,
          x: Math.max(0, prev.x - DINO_SPEED)
        }));
      }
      if (keysPressed.has('ArrowRight')) {
        setDino(prev => ({
          ...prev,
          x: Math.min(700, prev.x + DINO_SPEED)
        }));
      }
      if (keysPressed.has('Space') && !dino.isJumping) {
        setDino(prev => ({
          ...prev,
          isJumping: true,
          velocity: JUMP_FORCE
        }));
      }
    }, 16);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      clearInterval(moveInterval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, dino.isJumping]);

  // Update render effect with better cleanup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const trumpImage = new Image();
    const elonImage = new Image();
    const dinoClosedImage = new Image();
    const dinoOpenImage = new Image();

    trumpImage.src = '/trumpface.png';
    elonImage.src = '/elonmuskface.png';
    dinoClosedImage.src = '/dinomouthclose.png';
    dinoOpenImage.src = '/dinomouthopen.png';

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Add money-themed background
      ctx.fillStyle = '#065f46';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (gameState === 'playing') {
        // Draw score and lives
        ctx.font = 'bold 24px serif';
        ctx.fillStyle = '#eab308';
        ctx.fillText(`$${score}`, 20, 40);
        ctx.fillStyle = '#ef4444';
        ctx.fillText(`♥`.repeat(lives), 20, 70);

        // Draw dino and objects
        const dinoImage = isDinoOpen ? dinoOpenImage : dinoClosedImage;
        ctx.drawImage(dinoImage, dino.x, dino.y, 100, 100);

        objects.forEach(obj => {
          const image = obj.type === 'trump' ? trumpImage : elonImage;
          ctx.drawImage(image, obj.x, obj.y, 50, 50);
        });
      }

      requestAnimationFrame(render);
    };

    render();
  }, [objects, isDinoOpen, score, lives, gameState, dino]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (gameState !== 'playing') {
      startGame();
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (mouthTimeoutRef.current) {
        clearTimeout(mouthTimeoutRef.current);
      }
    };
  }, []);

  // Update level and spawn interval
  const updateLevel = () => {
    const newLevel = Math.floor(score / 100) + 1;
    setLevel(newLevel);
    // Make objects spawn faster as level increases, with a minimum of 400ms
    setSpawnInterval(Math.max(800 - (newLevel - 1) * 50, 400));
  };

  // Handle jump start
  const handleJump = () => {
    if (!dino.isJumping && gameState === 'playing') {
      setDino(prev => ({
        ...prev,
        isJumping: true,
        velocity: JUMP_FORCE
      }));
    }
  };

  return (
    <div className="min-h-screen bg-emerald-900 flex flex-col items-center justify-center p-8">
      <h1 className="text-6xl font-bold mb-8 text-yellow-500 font-serif tracking-wider">
        Eat The Rich
      </h1>
      
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="border-4 border-yellow-500 rounded-lg shadow-lg bg-emerald-800"
          onClick={handleMouseDown}
        />
        
        {/* Single game state overlay */}
        {gameState === 'start' && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
            <h2 className="text-yellow-500 text-4xl mb-4">Ready to eat?</h2>
            <button 
              onClick={startGame}
              className="mt-4 px-6 py-2 bg-emerald-700 text-yellow-500 rounded-lg hover:bg-emerald-600 transition"
            >
              Start Game
            </button>
          </div>
        )}
        
        {gameState === 'gameOver' && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
            <h2 className="text-red-500 text-4xl mb-4">Game Over!</h2>
            <p className="text-yellow-500 text-2xl">You consumed ${score} worth!</p>
            <button 
              onClick={startGame}
              className="mt-4 px-6 py-2 bg-emerald-700 text-yellow-500 rounded-lg hover:bg-emerald-600 transition"
            >
              Eat Again
            </button>
          </div>
        )}
      </div>
      
      {/* Instructions */}
      <div className="mt-6 text-emerald-400 text-center">
        <p className="mb-2">Use ← → to move | SPACE to jump</p>
        <p>Catch the billionaires before they escape!</p>
      </div>
    </div>
  );
}