'use client';

import { useEffect, useRef, useState } from 'react';

interface FallingObject {
  id: number;
  x: number;
  y: number;
  type: 'elon' | 'bezos' | 'zuck' | 'trump' | 'rainbow';
  isDragging: boolean;
}

interface Billionaire {
  name: string;
  netWorth: number;
  image: string;
  priceToEat: number;
}

// First, let's define the API response type
interface BillionaireApiResponse {
  name: string;
  netWorth: number;
}

// Create a mapping for billionaire names to their image files
const BILLIONAIRE_IMAGES = {
  'Elon Musk': '/elonmuskface.png',
  'Jeff Bezos': '/jeffbezosface.png',
  'Mark Zuckerberg': '/markzuckface.png',
  'Donald Trump': '/trumpface.png'
};

// Add these new interfaces after the existing interfaces
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface MoneyParticle {
  x: number;
  y: number;
  speed: number;
  symbol: string;
}

interface RainbowEffect {
  x: number;
  y: number;
  height: number;
  opacity: number;
  text: string;
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
  const [spawnInterval, setSpawnInterval] = useState(300);
  const [dino, setDino] = useState<DinoState>({
    x: 350,
    y: 500,
    isJumping: false,
    velocity: 0
  });
  const [billionaires, setBillionaires] = useState<Billionaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Adjust these constants for better game speed
  const DINO_SPEED = 14;
  const JUMP_FORCE = -20;
  const GRAVITY = 1.2;
  const GROUND_Y = 500;
  const CANVAS_HEIGHT = 600;
  const FALL_SPEED = 5; // Increased for faster falling
  const SPAWN_INTERVAL = 300; // Much faster initial spawn rate

  // Add a ref to track the mouth closing timeout
  const mouthTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add a ref for the animation frame
  const animationFrameRef = useRef<number>();
  const gameLoopIntervalRef = useRef<NodeJS.Timeout>();

  // Add these new state variables in the Game component
  const [particles, setParticles] = useState<Particle[]>([]);
  const [moneyRain, setMoneyRain] = useState<MoneyParticle[]>([]);
  const [rainbowEffects, setRainbowEffects] = useState<RainbowEffect[]>([]);

  // Add these constants with the other game constants
  const PARTICLE_COUNT = 20;
  const MONEY_PARTICLE_COUNT = 15;
  const MONEY_SYMBOLS = ['$', '💵', '💰', '💎'];
  const RAINBOW_SPAWN_CHANCE = 0.05; // Reduced to 2% chance for rainbow power-up
  const RAINBOW_COLORS = [
    '#FF0000', '#FF7F00', '#FFFF00', 
    '#00FF00', '#0000FF', '#4B0082', '#8B00FF'
  ];

  // Add new ref for preloaded images
  const preloadedImages = useRef<Map<string, HTMLImageElement>>(new Map());

  // Replace certain useState hooks with useRef
  const scoreRef = useRef<number>(0);
  const livesRef = useRef<number>(3);
  const objectsRef = useRef<FallingObject[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const moneyRainRef = useRef<MoneyParticle[]>([]);
  const rainbowEffectsRef = useRef<RainbowEffect[]>([]);
  const dinoRef = useRef<DinoState>({
    x: 350,
    y: 500,
    isJumping: false,
    velocity: 0
  });

  // Add these constants for difficulty scaling
  const INITIAL_MIN_OBJECTS = 2;  // Start with just 2 objects
  const INITIAL_MAX_OBJECTS = 4;  // Maximum of 4 at start
  const MAX_MIN_OBJECTS = 5;      // Never require more than 5 minimum
  const MAX_MAX_OBJECTS = 8;      // Never allow more than 8 total
  const OBJECTS_INCREASE_INTERVAL = 1000; // Slower progression - every 1000 points

  // Updated constants for slower start
  const INITIAL_SPAWN_INTERVAL = 2000;    // Increased from 1200 to 2000ms
  const MIN_SPAWN_INTERVAL = 800;         // Increased from 600 to 800ms
  const SPAWN_INTERVAL_DECREASE = 40;     // Decreased from 50 to 40 (slower progression)
  const FALL_SPEED_INITIAL = 2;          // Decreased from 3 to 2
  const FALL_SPEED_INCREASE = 0.15;      // Decreased from 0.2 to 0.15 (more gradual)
  const MAX_FALL_SPEED = 6;              // Decreased from 7 to 6
  const LEVEL_SCORE_REQUIREMENT = 250;    // Increased from 200 to 250 (longer levels)

  // Add these new state variables
  const [fallSpeed, setFallSpeed] = useState(FALL_SPEED_INITIAL);
  const [currentSpawnInterval, setCurrentSpawnInterval] = useState(INITIAL_SPAWN_INTERVAL);
  const lastSpawnTime = useRef(0);

  // Add this new effect at the start of the component
  useEffect(() => {
    // Preload all game images
    const preloadImages = () => {
      // Preload billionaire images
      Object.entries(BILLIONAIRE_IMAGES).forEach(([name, src]) => {
        const img = new Image();
        img.src = src;
        preloadedImages.current.set(name, img);
      });

      // Preload dino images
      const dinoClosedImage = new Image();
      const dinoOpenImage = new Image();
      dinoClosedImage.src = '/dinomouthclose.png';
      dinoOpenImage.src = '/dinomouthopen.png';
      preloadedImages.current.set('dinoClosed', dinoClosedImage);
      preloadedImages.current.set('dinoOpen', dinoOpenImage);
    };

    preloadImages();
  }, []);

  // Fetch billionaire data when game starts
  useEffect(() => {
    const fetchBillionaires = async () => {
      try {
        const response = await fetch('/api/billionaires');
        const data = await response.json();
        setBillionaires(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch billionaire data:', error);
        setLoading(false);
      }
    };

    fetchBillionaires();
  }, []);

  const startGame = () => {
    // Clear any existing timeouts and animation frames
    if (mouthTimeoutRef.current) {
      clearTimeout(mouthTimeoutRef.current);
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Reset all particles and effects
    setParticles([]);
    setMoneyRain([]);
    setRainbowEffects([]);

    // Reset dino state
    setDino({
      x: 350,
      y: 500,
      isJumping: false,
      velocity: 0
    });
    setIsDinoOpen(false);
    
    // Start the game loop
    setGameState('playing');
    setScore(0);
    setLives(3);
    setLevel(1);
    setSpawnInterval(300); // Start with faster spawns
    setObjects([]);
    
    spawnNewObject(); // Immediately spawn first object when game starts
  };

  // Modify the continuous movement effect
  useEffect(() => {
    if (gameState !== 'playing') return;

    let lastTime = performance.now();
    const keysPressed = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default behavior for space key
      if (e.code === 'Space') {
        e.preventDefault();
      }
      keysPressed.add(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Prevent default behavior for space key
      if (e.code === 'Space') {
        e.preventDefault();
      }
      keysPressed.delete(e.code);
    };

    // Separate animation frame for dino movement
    const updateDino = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Normalize movement speed using deltaTime
      const frameAdjustedSpeed = (DINO_SPEED * deltaTime) / 16.67; // 16.67ms is target frame time (60fps)

      setDino(prev => {
        let newX = prev.x;
        let newY = prev.y;
        let newVelocity = prev.velocity;
        let newIsJumping = prev.isJumping;

        // Handle horizontal movement
        if (keysPressed.has('ArrowLeft')) {
          newX = Math.max(0, newX - frameAdjustedSpeed);
        }
        if (keysPressed.has('ArrowRight')) {
          newX = Math.min(700, newX + frameAdjustedSpeed);
        }

        // Handle jumping physics
        if (prev.isJumping) {
          newVelocity = prev.velocity + GRAVITY;
          newY = prev.y + newVelocity;

          if (newY >= GROUND_Y) {
            newY = GROUND_Y;
            newIsJumping = false;
            newVelocity = 0;
          }
        } else if (keysPressed.has('Space')) {
          newIsJumping = true;
          newVelocity = JUMP_FORCE;
          
        }

        return {
          x: newX,
          y: newY,
          velocity: newVelocity,
          isJumping: newIsJumping
        };
      });

      if (gameState === 'playing') {
        requestAnimationFrame(updateDino);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    const animationId = requestAnimationFrame(updateDino);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationId);
    };
  }, [gameState]);

  // Modify spawn new object function to ensure better random placement
  const spawnNewObject = (xPosition?: number) => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== 'playing' || billionaires.length === 0) return;

    // Random chance to spawn rainbow power-up
    if (Math.random() < RAINBOW_SPAWN_CHANCE) {
      const newObject: FallingObject = {
        id: Date.now(),
        x: xPosition ?? Math.random() * (canvas.width - 50),
        y: -50 - (Math.random() * 100),
        type: 'rainbow',
        isDragging: false
      };
      setObjects(prev => [...prev, newObject]);
      return;
    }

    // Weight spawn chances by net worth (inverse - richer = rarer)
    const totalNetWorth = billionaires.reduce((sum, b) => sum + b.netWorth, 0);
    const weights = billionaires.map(b => 1 - (b.netWorth / totalNetWorth));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    let random = Math.random() * totalWeight;
    let selectedBillionaire = billionaires[0];
    
    for (let i = 0; i < weights.length; i++) {
      if (random <= weights[i]) {
        selectedBillionaire = billionaires[i];
        break;
      }
      random -= weights[i];
    }

    const newObject: FallingObject = {
      id: Date.now(),
      x: xPosition ?? Math.random() * (canvas.width - 50),
      y: -50 - (Math.random() * 100),
      type: selectedBillionaire.name,
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

    const hasCollided = (
      dinoBox.x < objBox.x + objBox.width &&
      dinoBox.x + dinoBox.width > objBox.x &&
      dinoBox.y < objBox.y + objBox.height &&
      dinoBox.y + dinoBox.height > objBox.y
    );

    if (hasCollided) {
      if (obj.type === 'rainbow') {
        createRainbowEffect(obj.x, obj.y);
        createParticles(obj.x + 25, obj.y + 25, RAINBOW_COLORS[Math.floor(Math.random() * RAINBOW_COLORS.length)]);
        return true;
      }
      createParticles(obj.x + 25, obj.y + 25, '#eab308');
      createMoneyRain(obj.x + 25, obj.y);
    }

    return hasCollided;
  };

  // Modify the renderGame function to use preloaded images
  const renderGame = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Ensure canvas dimensions are maintained
    canvas.width = 800;  // Force constant width
    canvas.height = 600; // Force constant height

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === 'playing') {
      // Draw score and lives
      ctx.font = 'bold 24px serif';
      ctx.fillStyle = '#eab308';
      ctx.fillText(`$${score}`, 20, 40);
      ctx.fillStyle = '#ef4444';
      ctx.fillText(`♥`.repeat(lives), 20, 70);

      // Draw dino using preloaded images
      const dinoImage = preloadedImages.current.get(isDinoOpen ? 'dinoOpen' : 'dinoClosed');
      if (dinoImage) {
        ctx.drawImage(dinoImage, dino.x, dino.y, 100, 100);
      }

      // Draw falling objects
      objects.forEach(obj => {
        if (obj.type === 'rainbow') {
          // Draw rainbow emoji
          ctx.font = '40px Arial';
          ctx.fillText('🌈', obj.x, obj.y + 40);
        } else {
          // Draw billionaire images
          const img = preloadedImages.current.get(obj.type);
          if (img) {
            ctx.drawImage(img, obj.x, obj.y, 50, 50);
          }
        }
      });

      // Render particles
      particles.forEach((particle) => {
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render money rain
      ctx.globalAlpha = 1;
      ctx.font = '24px serif';
      moneyRain.forEach((money) => {
        ctx.fillStyle = '#eab308';
        ctx.fillText(money.symbol, money.x, money.y);
      });

      // Render rainbow effects
      rainbowEffects.forEach(effect => {
        // Create full-width rainbow gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        
        RAINBOW_COLORS.forEach((color, index) => {
          gradient.addColorStop(index / (RAINBOW_COLORS.length - 1), color);
        });
        
        ctx.globalAlpha = effect.opacity;
        ctx.fillStyle = gradient;
        
        // Draw rising rainbow curtain
        const curtainHeight = canvas.height - effect.y;
        ctx.fillRect(0, effect.y, canvas.width, curtainHeight);
        
        // Add text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add slight shadow for better visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(effect.text, canvas.width / 2, effect.y + curtainHeight / 2);
        ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(renderGame);
  };

  // Update game loop effect to ensure continuous running
  useEffect(() => {
    if (gameState === 'playing') {
      const gameLoop = () => {
        // Update falling objects with collision detection
        setObjects((prevObjects) => {
          return prevObjects.map((obj) => ({
            ...obj,
            y: obj.y + fallSpeed,
          })).filter((obj) => {
            // Check if object hits dino
            if (checkCollision(dino, obj)) {
              const billionaire = billionaires.find(b => b.name === obj.type);
              if (billionaire) {
                setScore(prev => prev + billionaire.priceToEat);
              }
              setIsDinoOpen(true);
              if (mouthTimeoutRef.current) {
                clearTimeout(mouthTimeoutRef.current);
              }
              mouthTimeoutRef.current = setTimeout(() => {
                setIsDinoOpen(false);
              }, 200);
              return false;
            }
            if (obj.y >= CANVAS_HEIGHT) {
              setLives(prev => prev - 1);
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

        // Update particles
        setParticles(prev => 
          prev.map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life - 0.02
          })).filter(p => p.life > 0)
        );

        // Update money rain
        setMoneyRain(prev =>
          prev.map(m => ({
            ...m,
            y: m.y + m.speed
          })).filter(m => m.y < CANVAS_HEIGHT)
        );

        // Update rainbow effects - increased speed and fade rate
        setRainbowEffects(prev => 
          prev.map(effect => ({
            ...effect,
            y: effect.y - 20, // Increased from -10 to -20 for faster rising
            opacity: effect.y < 0 ? effect.opacity - 0.04 : effect.opacity // Faster fade out
          })).filter(effect => effect.opacity > 0)
        );

        renderGame();
        animationFrameRef.current = requestAnimationFrame(gameLoop);
      };

      animationFrameRef.current = requestAnimationFrame(gameLoop);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [gameState, dino, lives, billionaires, fallSpeed]);

  // Replace the spawn timer effect with this improved version
  useEffect(() => {
    if (gameState !== 'playing') return;

    const spawnLoop = (timestamp: number) => {
      if (timestamp - lastSpawnTime.current >= currentSpawnInterval) {
        const currentObjects = objects.filter(obj => obj.type !== 'rainbow').length;
        
        // Calculate how many objects we should have based on level
        const targetObjects = Math.min(
          Math.floor(level * 1.5) + 1, // Gradual increase
          MAX_MAX_OBJECTS
        );

        if (currentObjects < targetObjects) {
          // Spawn object with position distribution
          const canvas = canvasRef.current;
          if (canvas) {
            // Divide canvas into sections for better distribution
            const sections = targetObjects;
            const sectionWidth = canvas.width / sections;
            const availableSections = Array.from({ length: sections }, (_, i) => i)
              .filter(section => {
                const sectionX = section * sectionWidth;
                return !objects.some(obj => 
                  obj.x >= sectionX && obj.x < sectionX + sectionWidth
                );
              });

            if (availableSections.length > 0) {
              const randomSection = availableSections[Math.floor(Math.random() * availableSections.length)];
              const baseX = randomSection * sectionWidth;
              const randomOffset = Math.random() * (sectionWidth - 50); // 50 is object width
              spawnNewObject(baseX + randomOffset);
            }
          }
        }
        lastSpawnTime.current = timestamp;
      }

      if (gameState === 'playing') {
        requestAnimationFrame(spawnLoop);
      }
    };

    const animationId = requestAnimationFrame(spawnLoop);
    return () => cancelAnimationFrame(animationId);
  }, [gameState, level, objects, currentSpawnInterval]);

  // Update the level management
  useEffect(() => {
    if (gameState !== 'playing') return;

    const newLevel = Math.floor(score / LEVEL_SCORE_REQUIREMENT) + 1;
    if (newLevel !== level) {
      setLevel(newLevel);
      
      // Update spawn interval
      const newSpawnInterval = Math.max(
        INITIAL_SPAWN_INTERVAL - (newLevel - 1) * SPAWN_INTERVAL_DECREASE,
        MIN_SPAWN_INTERVAL
      );
      setCurrentSpawnInterval(newSpawnInterval);

      // Update fall speed
      const newFallSpeed = Math.min(
        FALL_SPEED_INITIAL + (newLevel - 1) * FALL_SPEED_INCREASE,
        MAX_FALL_SPEED
      );
      setFallSpeed(newFallSpeed);
    }
  }, [score, gameState]);

  // Update render effect with better cleanup
  useEffect(() => {
    renderGame();
  }, [objects, isDinoOpen, score, lives, gameState, dino, billionaires]);

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

  // Add this new function after the existing helper functions
  const createParticles = (x: number, y: number, color: string = '#eab308') => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT;
      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * (Math.random() * 5 + 2),
        vy: Math.sin(angle) * (Math.random() * 5 + 2),
        life: 1,
        color
      });
    }
    const MAX_PARTICLES = 500;
    setParticles(prev => [...prev, ...newParticles].slice(-MAX_PARTICLES));
  };

  // Add this function to create money rain effect
  const createMoneyRain = (x: number, y: number) => {
    const newMoneyParticles: MoneyParticle[] = [];
    for (let i = 0; i < MONEY_PARTICLE_COUNT; i++) {
      newMoneyParticles.push({
        x: x + Math.random() * 100 - 50,
        y: y,
        speed: Math.random() * 3 + 2,
        symbol: MONEY_SYMBOLS[Math.floor(Math.random() * MONEY_SYMBOLS.length)]
      });
    }
    const MAX_MONEY_RAIN = 300;
    setMoneyRain(prev => [...prev, ...newMoneyParticles].slice(-MAX_MONEY_RAIN));
  };

  // Add rainbow effect creation function
  const createRainbowEffect = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const newEffect: RainbowEffect = {
      x: 0, // Start at left edge
      y: canvas.height, // Start from bottom
      height: 0,
      opacity: 1,
      text: "QUEER AGENDA"
    };
    
    const MAX_RAINBOW_EFFECTS = 10;
    setRainbowEffects(prev => [...prev, newEffect].slice(-MAX_RAINBOW_EFFECTS));
    
    // Clear all billionaires except rainbows
    setObjects(prev => {
      const billionairesCleared = prev.filter(obj => obj.type !== 'rainbow').length;
      setScore(s => s + (billionairesCleared * 50));
      return prev.filter(obj => obj.type === 'rainbow');
    });
  };

  return (
    <div className="min-h-screen bg-emerald-900 flex flex-col items-center justify-center p-8">
      <h1 className="text-6xl font-bold mb-8 text-yellow-500 font-serif tracking-wider">
        Eat The Rich
      </h1>
      
      <div className="mb-6 bg-emerald-800 p-4 rounded-lg border-2 border-yellow-500">
        <h2 className="text-yellow-500 text-2xl mb-3 text-center">High-Value Targets</h2>
        
        {loading ? (
          <div className="text-emerald-100 text-center p-4">Loading...</div>
        ) : error ? (
          <div className="text-red-400 text-center p-4">{error}</div>
        ) : billionaires.length === 0 ? (
          <div className="text-emerald-100 text-center p-4">No data available</div>
        ) : (
          <table className="w-full text-emerald-100">
            <thead>
              <tr className="border-b border-emerald-600">
                <th className="px-4 py-2 text-left">Target</th>
                <th className="px-4 py-2 text-right">Net Worth</th>
                <th className="px-4 py-2 text-right">Price for Eating Them</th>
              </tr>
            </thead>
            <tbody>
              {billionaires.map((billionaire) => (
                <tr key={billionaire.name} className="border-b border-emerald-700">
                  <td className="px-4 py-2 flex items-center">
                    <img 
                      src={BILLIONAIRE_IMAGES[billionaire.name]}
                      alt={billionaire.name} 
                      className="w-8 h-8 rounded-full mr-2"
                      onError={(e) => {
                        e.currentTarget.src = '@fallback-avatar.png';
                      }}
                    />
                    {billionaire.name}
                  </td>
                  <td className="px-4 py-2 text-right">
                    ${(billionaire.netWorth / 1000000000).toFixed(1)}B
                  </td>
                  <td className="px-4 py-2 text-right">
                    ${billionaire.priceToEat}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
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