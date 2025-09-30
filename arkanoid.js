const canvas = document.getElementById('gameCanvas');
canvas.height = 500; // Increased height for score area
canvas.width = 480; // (keep width as before or adjust as needed)
const ctx = canvas.getContext('2d');
let score = 0;
let scorePopups = []; // stores temporary score display data
let scoreMultiplier = 10; // Starts at 10
const rowColors = ["#f00", "#fa0", "#ff0", "#0f0", "#0ff"];

// Highscore
let highscore = parseInt(localStorage.getItem('arkanoidHighscore')) || 0;

// Game state
let gameOver = false;

// Paddle
const paddleHeight = 10;
const paddleWidth = 75;
let paddleX = (canvas.width - paddleWidth) / 2;
let rightPressed = false;
let leftPressed = false;
const brickPadding = 1;

// Ball
const ballRadius = 8;
let x = canvas.width / 2;
let y = canvas.height - 50; // Start ball a bit higher to account for new height
let dx = 2;
let dy = -2;

// Bricks settings
const brickRowCount = 5;
const brickColumnCount = 8;
const brickWidth = 50;
const brickHeight = 20;

let bricks = [];
function initBricks() {
    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r] = { x: 0, y: 0, status: 0, falling: false, vy: 0, opacity: 1, flash: false, flashTimer: 0 };
        }
    }
}

initBricks();

// Level management
const levels = [
    'levels/level1.csv',
    'levels/level2.csv',
    'levels/level3.csv',
    'levels/level4.csv',
    'levels/level5.csv',
    'levels/level6.csv',
    'levels/level7.csv',
    'levels/level8.csv',
    'levels/level9.csv',
    'levels/level10.csv'
];
let currentLevelIndex = 0;
let levelTransitioning = false;

async function loadLevel(index) {
    if (index < 0 || index >= levels.length) return false;
    const path = levels[index];
    try {
        const resp = await fetch(path);
        if (!resp.ok) throw new Error('Failed to load level ' + path);
        const text = await resp.text();
        const rows = text.trim().split('\n').map(line => line.trim()).filter(Boolean);
        initBricks();
        for (let r = 0; r < Math.min(rows.length, brickRowCount); r++) {
            const cols = rows[r].split(',').map(s => parseInt(s, 10) || 0);
            for (let c = 0; c < Math.min(cols.length, brickColumnCount); c++) {
                bricks[c][r].status = cols[c] === 1 ? 1 : 0;
                bricks[c][r].falling = false;
                bricks[c][r].vy = 0;
                bricks[c][r].opacity = 1;
                bricks[c][r].flash = false;
                bricks[c][r].flashTimer = 0;
            }
        }
        currentLevelIndex = index;
        return true;
    } catch (err) {
        console.error('Error loading level:', err);
        return false;
    }
}

// Load the first level
loadLevel(0).then(ok => {
    if (!ok) console.warn('Failed to load initial level');
});

async function advanceLevel() {
    if (levelTransitioning) return;
    levelTransitioning = true;
    const next = currentLevelIndex + 1;
    if (next >= levels.length) {
        // Completed final level -> end game
        alert('YOU WIN! Final score: ' + score);
        gameOver = true;
        restartBtn.style.display = 'block';
        levelTransitioning = false;
        return;
    }
    const ok = await loadLevel(next);
    if (ok) {
        // Reset ball and paddle for next level but keep score
        paddleX = (canvas.width - paddleWidth) / 2;
        x = canvas.width / 2;
        y = canvas.height - 50;
        dx = 2;
        dy = -2;
        scoreMultiplier = 10;
    } else {
        console.warn('Failed to load next level');
    }
    levelTransitioning = false;
}
const brickOffsetTop = 60; // Move bricks lower to allow score display
const brickOffsetLeft = 30;

// Starfield
const STAR_COUNT = 80;
let stars = [];
for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 0.5 + Math.random() * 1.5,
        size: 1 + Math.random() * 1.5
    });
}

// Event Listeners
document.addEventListener('keydown', keyDownHandler);
document.addEventListener('keyup', keyUpHandler);

function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = true;
    else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = true;
}

function keyUpHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = false;
    else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = false;
}

// Collision Detection
function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1 && !b.falling && !b.flash) {
                if (
                    x + ballRadius > b.x && x - ballRadius < b.x + brickWidth &&
                    y + ballRadius > b.y && y - ballRadius < b.y + brickHeight
                ) {
                    // Find previous position
                    let prevX = x - dx;
                    let prevY = y - dy;

                    // Was the ball previously above/below or to the side?
                    let collidedHorizontally = (prevX + ballRadius <= b.x || prevX - ballRadius >= b.x + brickWidth);
                    let collidedVertically = (prevY + ballRadius <= b.y || prevY - ballRadius >= b.y + brickHeight);

                    if (collidedHorizontally) {
                        dx = -dx; // Hit left/right side, bounce X
                    } else if (collidedVertically) {
                        dy = -dy; // Hit top/bottom, bounce Y
                    } else {
                        // fallback: reverse both if in doubt (corner hit)
                        dx = -dx;
                        dy = -dy;
                    }

                    b.flash = true;
                    b.flashTimer = 6; // frames to flash
                    // Trigger screenshake on brick hit
                    shakeTimer = 6;
                    shakeIntensity = 3;
                    score += scoreMultiplier;
                    scorePopups.push({
                        x: b.x + brickWidth / 2,
                        y: b.y,
                        text: `+${scoreMultiplier}`,
                        opacity: 1.0
                    });
                    scoreMultiplier += 10;
                }

            }
        }
    }
}

// Drawing Functions
function drawBall() {
    // Create a radial gradient to give the ball a spherical look
    const base = '#09f';
    const grad = ctx.createRadialGradient(
        x - ballRadius * 0.35, y - ballRadius * 0.35, Math.max(1, ballRadius * 0.1),
        x + ballRadius * 0.25, y + ballRadius * 0.25, ballRadius * 1.1
    );
    grad.addColorStop(0, 'rgba(255,255,255,0.95)'); // bright specular
    grad.addColorStop(0.18, shadeColor(base, 22));
    grad.addColorStop(0.6, base);
    grad.addColorStop(1, shadeColor(base, -36));

    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    // subtle rim to define the sphere
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.stroke();
    ctx.closePath();
}

function drawPaddle() {
    const py = canvas.height - paddleHeight - 20; // Move paddle up by 20px
    const base = '#0f0';
    // vertical gradient: lighter on top, darker on bottom
    const g = ctx.createLinearGradient(paddleX, py, paddleX, py + paddleHeight);
    g.addColorStop(0, shadeColor(base, 30));
    g.addColorStop(0.5, base);
    g.addColorStop(1, shadeColor(base, -30));

    ctx.beginPath();
    ctx.rect(paddleX, py, paddleWidth, paddleHeight);
    ctx.fillStyle = g;
    ctx.fill();
    // top highlight
    ctx.lineWidth = 2;
    ctx.strokeStyle = shadeColor(base, 60);
    ctx.beginPath();
    ctx.moveTo(paddleX + 2, py + 1);
    ctx.lineTo(paddleX + paddleWidth - 2, py + 1);
    ctx.stroke();
    // bottom shadow
    ctx.lineWidth = 2;
    ctx.strokeStyle = shadeColor(base, -50);
    ctx.beginPath();
    ctx.moveTo(paddleX + 2, py + paddleHeight - 1);
    ctx.lineTo(paddleX + paddleWidth - 2, py + paddleHeight - 1);
    ctx.stroke();
    ctx.closePath();
}

// Color helper: convert hex to {r,g,b}
function hexToRgb(hex) {
    // Expand shorthand form (e.g. "#03F") to full form ("#0033FF")
    let h = hex.replace('#','');
    if (h.length === 3) {
        h = h.split('').map(ch => ch + ch).join('');
    }
    const bigint = parseInt(h, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

// Return an rgb(...) string after shifting brightness by percent (-100..100)
function shadeColor(hex, percent) {
    const {r,g,b} = hexToRgb(hex);
    const amt = Math.round(2.55 * percent);
    const nr = Math.max(0, Math.min(255, r + amt));
    const ng = Math.max(0, Math.min(255, g + amt));
    const nb = Math.max(0, Math.min(255, b + amt));
    return `rgb(${nr},${ng},${nb})`;
}

function makeBrickGradient(x, y, w, h, baseColor) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, shadeColor(baseColor, 22)); // lighter top-left
    g.addColorStop(0.5, baseColor);
    g.addColorStop(1, shadeColor(baseColor, -18)); // darker bottom-right
    return g;
}

function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            let b = bricks[c][r];
            const baseColor = rowColors[brickRowCount - 1 - r] || "#999";
            if (b.status === 1) {
                // Normal brick
                const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
                const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
                b.x = brickX;
                b.y = brickY;

                ctx.save();
                ctx.globalAlpha = 1;

                // Fill with a diagonal gradient for a 3D effect
                if (b.flash) {
                    ctx.fillStyle = '#fff';
                } else {
                    ctx.fillStyle = makeBrickGradient(brickX, brickY, brickWidth, brickHeight, baseColor);
                }
                ctx.beginPath();
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                ctx.fill();
                ctx.closePath();

                // Subtle highlight on top/left
                if (!b.flash) {
                    ctx.beginPath();
                    ctx.strokeStyle = shadeColor(baseColor, 40);
                    ctx.lineWidth = 2;
                    // top edge
                    ctx.moveTo(brickX + 1, brickY + 1);
                    ctx.lineTo(brickX + brickWidth - 1, brickY + 1);
                    // left edge
                    ctx.moveTo(brickX + 1, brickY + 1);
                    ctx.lineTo(brickX + 1, brickY + brickHeight - 1);
                    ctx.stroke();

                    // Subtle shadow on bottom/right
                    ctx.beginPath();
                    ctx.strokeStyle = shadeColor(baseColor, -38);
                    ctx.lineWidth = 2;
                    // bottom edge
                    ctx.moveTo(brickX + 1, brickY + brickHeight - 1);
                    ctx.lineTo(brickX + brickWidth - 1, brickY + brickHeight - 1);
                    // right edge
                    ctx.moveTo(brickX + brickWidth - 1, brickY + 1);
                    ctx.lineTo(brickX + brickWidth - 1, brickY + brickHeight - 1);
                    ctx.stroke();
                }

                ctx.restore();

                if (b.flash) {
                    b.flashTimer--;
                    if (b.flashTimer <= 0) {
                        b.flash = false;
                        b.status = 2; // Mark as hit, start falling
                        b.falling = true;
                        b.vy = 0;
                        b.opacity = 1;
                    }
                }
            } else if (b.falling) {
                // Animate falling and fading
                b.vy += 0.25; // gravity
                b.y += b.vy;
                b.opacity -= 0.025;
                ctx.save();
                ctx.globalAlpha = Math.max(0, b.opacity);

                // Use a slightly darker gradient when falling
                ctx.fillStyle = makeBrickGradient(b.x, b.y, brickWidth, brickHeight, baseColor);
                ctx.beginPath();
                ctx.rect(b.x, b.y, brickWidth, brickHeight);
                ctx.fill();
                ctx.closePath();
                ctx.restore();
                // Remove brick when faded and off screen
                if (b.opacity <= 0 || b.y > canvas.height) {
                    b.falling = false;
                    b.status = 0;
                }
            }
        }
    }
}

function drawScorePopups() {
    for (let i = 0; i < scorePopups.length; i++) {
        const popup = scorePopups[i];
        ctx.font = "14px Arial";
        ctx.fillStyle = `rgba(255, 255, 0, ${popup.opacity})`;
        ctx.textAlign = "center";
        ctx.fillText(popup.text, popup.x, popup.y);
        popup.y -= 0.5;
        popup.opacity -= 0.02;
    }
    // Remove faded-out popups
    scorePopups = scorePopups.filter(p => p.opacity > 0);
}

function drawScore() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.fillText("Score: " + score, 8, 20);
    ctx.fillText("Highscore: " + highscore, 8, 40);
}

function drawStarfield() {
    ctx.save();
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < stars.length; i++) {
        let s = stars[i];
        // Map size (1 to 2.5) to brightness (120 to 255)
        let brightness = Math.round(120 + (s.size - 1) / 1.5 * (255 - 120));
        ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        // Move star
        s.y += s.speed;
        if (s.y > canvas.height) {
            s.y = 0;
            s.x = Math.random() * canvas.width;
        }
    }
    ctx.restore();
}

// Add restart button to DOM
let restartBtn = document.createElement('button');
restartBtn.textContent = 'Restart';
restartBtn.style.position = 'absolute';
restartBtn.style.left = '50%';
restartBtn.style.top = '50%';
restartBtn.style.transform = 'translate(-50%, -50%)';
restartBtn.style.fontSize = '24px';
restartBtn.style.padding = '12px 32px';
restartBtn.style.display = 'none';
document.body.appendChild(restartBtn);

restartBtn.addEventListener('click', function() {
    resetGame();
    restartBtn.style.display = 'none';
    gameOver = false;
    draw();
});

function resetGame() {
    // Update highscore if needed
    if (score > highscore) {
        highscore = score;
        localStorage.setItem('arkanoidHighscore', highscore);
    }
    // Reset all game variables
    score = 0;
    scoreMultiplier = 10;
    scorePopups = [];
    paddleX = (canvas.width - paddleWidth) / 2;
    x = canvas.width / 2;
    y = canvas.height - 50; // Start ball a bit higher to account for new height
    dx = 2;
    dy = -2;
    // Load the first level layout from CSV so restart matches level design files
    loadLevel(0).then(ok => {
        if (!ok) {
            // Fallback: if loading fails, fill every brick so the game is still playable
            for (let c = 0; c < brickColumnCount; c++) {
                for (let r = 0; r < brickRowCount; r++) {
                    bricks[c][r].status = 1;
                    bricks[c][r].falling = false;
                    bricks[c][r].vy = 0;
                    bricks[c][r].opacity = 1;
                    bricks[c][r].flash = false;
                    bricks[c][r].flashTimer = 0;
                }
            }
        }
    });
}

// Screenshake variables
let shakeTimer = 0;
let shakeIntensity = 0;
let shakeOffsetX = 0;
let shakeOffsetY = 0;

function draw() {
    if (gameOver) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Screenshake logic
    if (shakeTimer > 0) {
        shakeOffsetX = (Math.random() - 0.5) * shakeIntensity;
        shakeOffsetY = (Math.random() - 0.5) * shakeIntensity;
        ctx.save();
        ctx.translate(shakeOffsetX, shakeOffsetY);
        shakeTimer--;
    } else {
        shakeOffsetX = 0;
        shakeOffsetY = 0;
    }
    drawStarfield();
    drawBricks();
    drawBall();
    drawPaddle();
    drawScorePopups();
    drawScore();
    collisionDetection();

    // Ball Movement
    x += dx;
    y += dy;

    // Wall Collision
    if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
        dx = -dx;
        // Trigger screenshake on wall hit
        shakeTimer = 4;
        shakeIntensity = 2;
    }
    if (y + dy < 40 + ballRadius) dy = -dy; // Prevent ball from going into score area
    else if (y + dy > canvas.height - ballRadius - 20) {
        if (x > paddleX && x < paddleX + paddleWidth) {
            // Calculate hit position (-1 to 1)
            let hit = (x - (paddleX + paddleWidth / 2)) / (paddleWidth / 2);
            // Set maximum bounce angle (radians, e.g. 60deg)
            let maxAngle = Math.PI / 3;
            let angle = hit * maxAngle;
            // Set speed
            let speed = Math.sqrt(dx * dx + dy * dy);
            dx = speed * Math.sin(angle);
            dy = -Math.abs(speed * Math.cos(angle));
            scoreMultiplier = 10;
        } else {
            // Update highscore if needed
            if (score > highscore) {
                highscore = score;
                localStorage.setItem('arkanoidHighscore', highscore);
            }
            gameOver = true;
            restartBtn.style.display = 'block';
            return;
        }
    }

    // Paddle Movement
    if (rightPressed && paddleX < canvas.width - paddleWidth) {
        paddleX += 5;
    } else if (leftPressed && paddleX > 0) {
        paddleX -= 5;
    }

    // Win condition
    let bricksLeft = 0;
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) bricksLeft++;
        }
    }
    if (bricksLeft === 0) {
        // advance to next level (keeps score)
        advanceLevel();
    }
    if (shakeTimer > 0) {
        ctx.restore();
    }
    requestAnimationFrame(draw);
}

draw();
