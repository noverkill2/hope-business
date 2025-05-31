const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const victoryScreen = document.getElementById('victory-screen');
const scoreDisplay = document.getElementById('score');
const finalScoreDisplay = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');
const victoryRestartButton = document.getElementById('victory-restart-button');

// Valores iniciais aumentados para o container maior
let gameContainerWidth = 800;
let gameContainerHeight = 900;

function resizeCanvas() {
    const container = document.getElementById('game-container');
    gameContainerWidth = container.clientWidth;
    gameContainerHeight = container.clientHeight;
    canvas.width = gameContainerWidth;
    canvas.height = gameContainerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Initial resize

// Game variables
let bird;
let pipes = [];
let score = 0;
let gameStarted = false;
let gameOver = false;
let animationFrameId;
let lastFrameTime = 0;
const FPS = 60;
const frameTime = 1000 / FPS;

// Bird properties - aumentados proporcionalmente
const birdWidth = 70; // Aumentado de 50 para 70
const birdHeight = 70; // Aumentado de 50 para 70
let birdX = gameContainerWidth * 0.2;
let birdY = gameContainerHeight / 2 - birdHeight / 2;
let birdVelocity = 0;
const gravity = 0.15;
const jumpStrength = -4.5; // Ajustado para o tamanho maior

// Pipe properties - aumentados proporcionalmente
const pipeWidth = 120; // Aumentado de 80 para 120
const pipeGap = 220; // Aumentado de 200 para 220
const pipeSpeed = 1.8; // Ligeiramente aumentado para compensar a área maior
const pipeSpawnInterval = 150;
let frameCount = 0;

// Load bird image
const birdImg = new Image();
birdImg.src = 'images/manu.jpg';

// Background elements - aumentados proporcionalmente
const groundHeight = 100; // Aumentado de 80 para 100
let groundX = 0;
const groundSpeed = pipeSpeed;

// Nuvens maiores e mais detalhadas
const clouds = [
    { x: 0.2, y: 0.15, size: 40 },
    { x: 0.5, y: 0.25, size: 35 },
    { x: 0.8, y: 0.1, size: 45 },
    { x: 0.3, y: 0.3, size: 30 }
];

function Bird() {
    this.x = birdX;
    this.y = birdY;
    this.width = birdWidth;
    this.height = birdHeight;
    this.velocity = birdVelocity;
    this.rotation = 0;

    this.draw = function() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        
        // Rotação baseada na velocidade (limitada)
        this.rotation = Math.max(-25, Math.min(25, this.velocity * 3));
        ctx.rotate(this.rotation * Math.PI / 180);
        
        // Desenhar uma borda suave ao redor da imagem
        ctx.beginPath();
        ctx.arc(0, 0, this.width/2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        ctx.drawImage(birdImg, -this.width / 2, -this.height / 2, this.width, this.height);
        
        // Adicionar um brilho sutil
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 10;
        
        ctx.restore();
    }

    this.update = function() {
        this.velocity += gravity;
        this.y += this.velocity;

        // Prevent bird from going above the screen
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }

        // Check for ground collision
        if (this.y + this.height > gameContainerHeight - groundHeight) {
            this.y = gameContainerHeight - groundHeight - this.height;
            this.velocity = 0;
            endGame();
        }
    }

    this.flap = function() {
        if (!gameOver) {
            this.velocity = jumpStrength;
        }
    }
}

function Pipe(x, y, height, isTop) {
    this.x = x;
    this.y = y;
    this.width = pipeWidth;
    this.height = height;
    this.isTop = isTop;
    this.passed = false;

    this.draw = function() {
        // Desenhar canos com estilo mais parecido com Flappy Bird
        const gradient = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
        gradient.addColorStop(0, '#228B22');
        gradient.addColorStop(0.5, '#32CD32');
        gradient.addColorStop(1, '#228B22');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Adicionar topo do cano (mais largo)
        const capHeight = 30; // Aumentado de 20 para 30
        const capWidth = this.width + 20; // Aumentado de 10 para 20
        
        const capGradient = ctx.createLinearGradient(this.x - 10, 0, this.x + this.width + 10, 0);
        capGradient.addColorStop(0, '#006400');
        capGradient.addColorStop(0.5, '#008000');
        capGradient.addColorStop(1, '#006400');
        
        ctx.fillStyle = capGradient;
        
        if (this.isTop) {
            ctx.fillRect(this.x - 10, this.y + this.height - capHeight, capWidth, capHeight);
        } else {
            ctx.fillRect(this.x - 10, this.y, capWidth, capHeight);
        }
        
        // Adicionar borda para melhor definição
        ctx.strokeStyle = '#006400';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }

    this.update = function() {
        this.x -= pipeSpeed;
    }
}

function drawGround() {
    // Desenhar o chão com gradiente
    const groundGradient = ctx.createLinearGradient(0, gameContainerHeight - groundHeight, 0, gameContainerHeight);
    groundGradient.addColorStop(0, '#8B4513');
    groundGradient.addColorStop(1, '#654321');
    
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, gameContainerHeight - groundHeight, gameContainerWidth, groundHeight);
    
    // Adicionar textura ao chão mais detalhada
    ctx.fillStyle = '#A0522D';
    for (let i = 0; i < gameContainerWidth; i += 40) {
        ctx.fillRect(i + groundX % 40, gameContainerHeight - groundHeight + 20, 20, 8);
        ctx.fillRect(i + 20 + groundX % 40, gameContainerHeight - groundHeight + 40, 20, 8);
    }
    
    // Adicionar linha superior do chão
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, gameContainerHeight - groundHeight);
    ctx.lineTo(gameContainerWidth, gameContainerHeight - groundHeight);
    ctx.stroke();
    
    // Mover o chão
    groundX -= groundSpeed;
}

function drawClouds() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
    for (const cloud of clouds) {
        const x = gameContainerWidth * cloud.x;
        const y = gameContainerHeight * cloud.y;
        const size = cloud.size;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.arc(x + size * 0.8, y - size * 0.3, size * 0.8, 0, Math.PI * 2);
        ctx.arc(x + size * 1.6, y, size * 0.7, 0, Math.PI * 2);
        ctx.fill();
    }
}

function spawnPipe() {
    const minHeight = 100; // Aumentado de 80 para 100
    const maxHeight = gameContainerHeight - groundHeight - pipeGap - minHeight;
    const topPipeHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    const bottomPipeHeight = gameContainerHeight - groundHeight - topPipeHeight - pipeGap;

    pipes.push(new Pipe(gameContainerWidth, 0, topPipeHeight, true));
    pipes.push(new Pipe(gameContainerWidth, gameContainerHeight - groundHeight - bottomPipeHeight, bottomPipeHeight, false));
}

function handlePipes() {
    if (frameCount % pipeSpawnInterval === 0) {
        spawnPipe();
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].update();
        pipes[i].draw();

        // Check for collision
        if (
            bird.x < pipes[i].x + pipes[i].width &&
            bird.x + bird.width > pipes[i].x &&
            bird.y < pipes[i].y + pipes[i].height &&
            bird.y + bird.height > pipes[i].y
        ) {
            endGame();
        }

        // Check for passing pipe
        if (!pipes[i].passed && pipes[i].x + pipes[i].width < bird.x && !pipes[i].isTop) {
            pipes[i].passed = true;
            score++;
            scoreDisplay.textContent = score;
            // Check for victory condition
            if (score === 5) {
                winGame();
            }
        }

        // Remove pipes that are off-screen
        if (pipes[i].x + pipes[i].width < 0) {
            pipes.splice(i, 1);
        }
    }
}

function drawBackground() {
    // Desenhar céu gradiente mais vibrante
    const gradient = ctx.createLinearGradient(0, 0, 0, gameContainerHeight - groundHeight);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.5, '#6495ED');
    gradient.addColorStop(1, '#1E90FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, gameContainerWidth, gameContainerHeight - groundHeight);
    
    // Desenhar nuvens
    drawClouds();
}

function gameLoop(timestamp) {
    if (gameOver) return;
    
    // Controle de FPS para garantir velocidade consistente
    const elapsed = timestamp - lastFrameTime;
    
    if (elapsed > frameTime) {
        lastFrameTime = timestamp - (elapsed % frameTime);
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background
        drawBackground();
        
        // Draw and update bird
        bird.update();
        bird.draw();
        
        // Handle pipes
        handlePipes();
        
        // Draw ground
        drawGround();
        
        frameCount++;
    }
    
    animationFrameId = requestAnimationFrame(gameLoop);
}

function startGame() {
    bird = new Bird();
    pipes = [];
    score = 0;
    frameCount = 0;
    groundX = 0;
    gameOver = false;
    gameStarted = true;
    lastFrameTime = 0;

    scoreDisplay.textContent = score;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    gameLoop();
}

function endGame() {
    if (gameOver) return; // Prevent multiple calls
    gameOver = true;
    gameStarted = false;
    cancelAnimationFrame(animationFrameId);
    finalScoreDisplay.textContent = score;
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
}

function winGame() {
    if (gameOver) return; // Prevent multiple calls
    gameOver = true;
    gameStarted = false;
    cancelAnimationFrame(animationFrameId);
    gameScreen.classList.add('hidden');
    victoryScreen.classList.remove('hidden');
}

// Event Listeners
document.addEventListener('click', () => {
    if (!gameStarted && !gameOver) {
        startGame();
    } else if (gameStarted && !gameOver) {
        bird.flap();
    }
});

document.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent default touch behavior (like scrolling)
    if (!gameStarted && !gameOver) {
        startGame();
    } else if (gameStarted && !gameOver) {
        bird.flap();
    }
}, { passive: false });

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp') {
        if (!gameStarted && !gameOver) {
            startGame();
        } else if (gameStarted && !gameOver) {
            bird.flap();
        }
    }
});

restartButton.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    startGame();
});

victoryRestartButton.addEventListener('click', () => {
    victoryScreen.classList.add('hidden');
    startGame();
});

// Initial setup - show start screen
startScreen.classList.remove('hidden');
