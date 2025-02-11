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

  // Add a ref to track the mouth closing timeout
  const mouthTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLives(3);
    setObjects([]);
  };

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

  // Game loop effect
  useEffect(() => {
    if (gameState !== 'playing') return;

    // Spawn interval
    const spawnInterval = setInterval(spawnNewObject, 2000); // Spawn every 2 seconds

    // Falling movement interval
    const fallInterval = setInterval(() => {
      setObjects(prev => prev.map(obj => {
        if (!obj.isDragging) {
          const newY = obj.y + 2; // Fall speed
          // Check if object fell off screen
          if (newY > 600) { // canvas height
            setLives(prev => {
              const newLives = prev - 1;
              if (newLives <= 0) {
                setGameState('gameOver');
              }
              return newLives;
            });
            return null; // Remove object
          }
          return { ...obj, y: newY };
        }
        return obj;
      }).filter(Boolean) as FallingObject[]);
    }, 16); // Update every ~16ms (60fps)

    return () => {
      clearInterval(spawnInterval);
      clearInterval(fallInterval);
    };
  }, [gameState]);

  // Render effect
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

      // Draw score and lives
      ctx.font = '24px Arial';
      ctx.fillStyle = 'black';
      ctx.fillText(`Score: ${score}`, 20, 40);
      ctx.fillText(`Lives: ${lives}`, 20, 70);

      // Draw dino
      const dinoImage = isDinoOpen ? dinoOpenImage : dinoClosedImage;
      ctx.drawImage(dinoImage, 350, 500, 100, 100);

      // Draw falling objects
      objects.forEach(obj => {
        const image = obj.type === 'trump' ? trumpImage : elonImage;
        ctx.drawImage(image, obj.x, obj.y, 50, 50);
      });

      // Draw game state screens
      if (gameState === 'start') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.fillText('Click to Start', canvas.width/2 - 120, canvas.height/2);
      } else if (gameState === 'gameOver') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.fillText('Game Over!', canvas.width/2 - 120, canvas.height/2);
        ctx.fillText(`Score: ${score}`, canvas.width/2 - 80, canvas.height/2 + 60);
      }

      requestAnimationFrame(render);
    };

    render();
  }, [objects, isDinoOpen, score, lives, gameState]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (gameState !== 'playing') {
      startGame();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if we clicked on any falling image
    const clickedObject = objects.find(obj => {
      return mouseX >= obj.x && 
             mouseX <= obj.x + 50 && 
             mouseY >= obj.y && 
             mouseY <= obj.y + 50;
    });

    if (clickedObject) {
      setDraggedObject(clickedObject);
      // Stop the object from falling while being dragged
      setObjects(prev => prev.map(obj =>
        obj.id === clickedObject.id ? { ...obj, isDragging: true } : obj
      ));
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedObject || gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Update dragged object position
    setObjects(prev => prev.map(obj =>
      obj.id === draggedObject.id 
        ? { ...obj, x: mouseX - 25, y: mouseY - 25, isDragging: true } 
        : obj
    ));

    // Check if over dino's mouth
    const dinoMouthX = 350;
    const dinoMouthY = 500;
    const isOverMouth = 
      mouseX >= dinoMouthX && 
      mouseX <= dinoMouthX + 100 && 
      mouseY >= dinoMouthY && 
      mouseY <= dinoMouthY + 100;

    if (isOverMouth) {
      // Clear any existing timeout
      if (mouthTimeoutRef.current) {
        clearTimeout(mouthTimeoutRef.current);
      }

      // Open mouth
      setIsDinoOpen(true);
      
      // Eat the image immediately when over mouth
      setObjects(prev => prev.filter(obj => obj.id !== draggedObject.id));
      setScore(prev => prev + 10);
      setDraggedObject(null);

      // Optional: Play eating sound
      try {
        const eatSound = new Audio('/eat-sound.mp3');
        eatSound.play().catch(() => {});
      } catch (error) {
        console.log('Sound not loaded');
      }

      // Set timeout to close mouth after eating
      mouthTimeoutRef.current = setTimeout(() => {
        setIsDinoOpen(false);
      }, 200); // Keep mouth open for 500ms after eating
    }
  };

  const handleMouseUp = () => {
    if (!draggedObject) return;
    
    // If released and not eaten, just release the object
    setObjects(prev => prev.map(obj =>
      obj.id === draggedObject.id ? { ...obj, isDragging: false } : obj
    ));
    
    setDraggedObject(null);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (mouthTimeoutRef.current) {
        clearTimeout(mouthTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border border-gray-400"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </div>
  );
}