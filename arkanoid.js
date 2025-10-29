const canvas = document.getElementById('gameCanvas');
canvas.height = 500; // Increased height for score area
canvas.width = 480; // (keep width as before or adjust as needed)
const ctx = canvas.getContext('2d');
let score = 0;
let scorePopups = []; // stores temporary score display data
let scoreMultiplier = 10; // Starts at 10
const rowColors = ["#f00", "#fa0", "#ff0", "#0f0", "#0ff"];

// Game mode tracking
let gameMode = 'normal'; // 'normal' or 'custom'
let customLevelData = null;

// Highscore stored in cookie
const HIGH_SCORE_COOKIE = 'arkanoidHighscore';

function getCookie(name) {
    // Simple, robust cookie parser to avoid complex regex and escaping issues
    if (!document.cookie) return null;
    const pairs = document.cookie.split('; ');
    for (let i = 0; i < pairs.length; i++) {
        const idx = pairs[i].indexOf('=');
        if (idx === -1) continue;
        const key = pairs[i].substring(0, idx);
        const val = pairs[i].substring(idx + 1);
        if (key === name) return decodeURIComponent(val);
    }
    return null;
}

function setCookie(name, value, days) {
    const expires = days ? '; max-age=' + days * 24 * 60 * 60 : '';
    document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/`;
}

let highscore = parseInt(getCookie(HIGH_SCORE_COOKIE), 10) || 0;

// Game state
let gameOver = false;

// Paddle
const paddleHeight = 10;
let paddleWidth = 75;
let paddleX = (canvas.width - paddleWidth) / 2;
let rightPressed = false;
let leftPressed = false;
const brickPadding = 1;

// Ball
const ballRadius = 8;
// starting speed for the ball (change this to adjust initial velocity)
let ballSpeed = 4;
// support multiple balls
let balls = [
    { x: canvas.width / 2, y: canvas.height - 50, dx: ballSpeed, dy: -ballSpeed, radius: ballRadius }
];

// Bricks settings
const brickRowCount = 5;
const brickColumnCount = 8;
const brickWidth = 50;
const brickHeight = 20;

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

// Bonus system
let bonuses = [];
let bricksSinceLastBonus = 0;
let targetBonusInterval = 10; // first bonus after ~10 bricks
const PAD_GROW_DURATION = 10000; // 10 seconds in milliseconds
let padGrowActive = false;
let padOriginalWidth = null;
let padGrowExpires = 0;

let bricks = [];
function initBricks() {
    // Initialize a fresh bricks grid with default properties
    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r] = {
                x: 0,
                y: 0,
                status: 0,
                falling: false,
                vy: 0,
                opacity: 1,
                flash: false,
                flashTimer: 0,
                dropType: null
            };
        }
    }
}
// Initialize bricks array at startup
initBricks();

// Load a level by index. Supports normal (CSV files listed in `levels`) and
// custom mode (level data in `customLevelData`). Returns true on success.
async function loadLevel(index) {
    if (gameMode === 'custom') {
        if (!customLevelData) return false;
        const rows = customLevelData.trim().split('\n').map(line => line.trim()).filter(Boolean);
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
    } else {
        // Normal campaign mode
        if (!Array.isArray(levels) || index < 0 || index >= levels.length) return false;
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
}

// Load the first level - but don't start until user clicks play
// loadLevel(0).then(ok => {
//     if (!ok) console.warn('Failed to load initial level');
// });

async function advanceLevel() {
    if (levelTransitioning) return;
    if (gameMode === 'custom') {
        // Custom levels don't advance - just restart the same level
        alert('Level Complete! Score: ' + score);
        gameOver = true;
        showGameOverButtons();
        levelTransitioning = false;
        return;
    }
    levelTransitioning = true;
    const next = currentLevelIndex + 1;
    if (next >= levels.length) {
        // Completed final level -> end game
        alert('YOU WIN! Final score: ' + score);
        gameOver = true;
        showGameOverButtons();
        levelTransitioning = false;
        return;
    }
    const ok = await loadLevel(next);
    if (ok) {
        // Reset ball and paddle for next level but keep score
        paddleX = (canvas.width - paddleWidth) / 2;
        balls = [
            { x: canvas.width / 2, y: canvas.height - 50, dx: ballSpeed, dy: -ballSpeed, radius: ballRadius }
        ];
        bonuses = [];
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

// Gamepad support
let gamepadIndex = null; // index of the connected gamepad (if any)
let gamepadAxis = 0; // -1..1 horizontal axis value from left stick
let gamepadPrevButtons = []; // previous frame button states for edge detection
const GAMEPAD_MAX_PADDLE_SPEED = 7; // max pixels/frame when stick fully tilted

window.addEventListener('gamepadconnected', (e) => {
    gamepadIndex = e.gamepad.index;
    console.log('Gamepad connected at index', gamepadIndex, 'id=', e.gamepad.id);
});

window.addEventListener('gamepaddisconnected', (e) => {
    if (gamepadIndex === e.gamepad.index) gamepadIndex = null;
    console.log('Gamepad disconnected from index', e.gamepad.index);
});

function updateGamepadState() {
    // Map gamepad axis/buttons to left/right movement
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = (gamepadIndex != null) ? gps[gamepadIndex] : (gps && gps.length ? gps[0] : null);
    if (!gp) return; // no gamepad

    // Axis 0: left stick horizontal (-1 left, +1 right)
    const axis = gp.axes && gp.axes.length > 0 ? gp.axes[0] : 0;
    const DEADZONE = 0.15; // smaller deadzone so light tilt moves slowly
    // store analog axis value for use in movement (clamped to -1..1)
    gamepadAxis = Math.max(-1, Math.min(1, axis));

    // If inside deadzone, treat axis as 0 and fallback to d-pad
    if (Math.abs(gamepadAxis) < DEADZONE) {
        gamepadAxis = 0;
        const btnLeft = gp.buttons && gp.buttons[14] ? gp.buttons[14].pressed : false;
        const btnRight = gp.buttons && gp.buttons[15] ? gp.buttons[15].pressed : false;
        leftPressed = !!btnLeft;
        rightPressed = !!btnRight;
    } else {
        // When analog stick is active, clear digital flags so movement is analog-driven
        leftPressed = false;
        rightPressed = false;
    }

    // Button edge detection (A button = button 0 on Xbox controllers)
    const aPressed = gp.buttons && gp.buttons[0] ? gp.buttons[0].pressed : false;
    const prevA = !!gamepadPrevButtons[0];
    if (aPressed && !prevA) {
        // rising edge - handle A button press
        handleAButtonPress();
    }
    // update previous buttons
    gamepadPrevButtons[0] = aPressed;
}

function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = true;
    else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = true;
}

function keyUpHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = false;
    else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = false;
}

// Collision Detection (per-ball)
function collisionDetection() {
    for (let bi = 0; bi < balls.length; bi++) {
        const ball = balls[bi];
        let collided = false;
        for (let c = 0; c < brickColumnCount; c++) {
            if (collided) break;
            for (let r = 0; r < brickRowCount; r++) {
                const b = bricks[c][r];
                if (b.status === 1 && !b.falling && !b.flash) {
                    if (
                        ball.x + ball.radius > b.x && ball.x - ball.radius < b.x + brickWidth &&
                        ball.y + ball.radius > b.y && ball.y - ball.radius < b.y + brickHeight
                    ) {
                        // Find previous position
                        const prevX = ball.x - ball.dx;
                        const prevY = ball.y - ball.dy;

                        const collidedHorizontally = (prevX + ball.radius <= b.x || prevX - ball.radius >= b.x + brickWidth);
                        const collidedVertically = (prevY + ball.radius <= b.y || prevY - ball.radius >= b.y + brickHeight);

                        if (collidedHorizontally) {
                            ball.dx = -ball.dx;
                        } else if (collidedVertically) {
                            ball.dy = -ball.dy;
                        } else {
                            ball.dx = -ball.dx;
                            ball.dy = -ball.dy;
                        }

                        b.flash = true;
                        b.flashTimer = 6;
                        shakeTimer = 6;
                        shakeIntensity = 3;
                        score += scoreMultiplier;
                        scorePopups.push({ x: b.x + brickWidth / 2, y: b.y, text: `+${scoreMultiplier}`, opacity: 1.0 });
                        scoreMultiplier += 10;

                        collided = true;
                        break;
                    }
                }
            }
        }
    }
}

// Drawing Functions
function drawBall(ball) {
    const base = '#09f';
    const grad = ctx.createRadialGradient(
        ball.x - ball.radius * 0.35, ball.y - ball.radius * 0.35, Math.max(1, ball.radius * 0.1),
        ball.x + ball.radius * 0.25, ball.y + ball.radius * 0.25, ball.radius * 1.1
    );
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.18, shadeColor(base, 22));
    grad.addColorStop(0.6, base);
    grad.addColorStop(1, shadeColor(base, -36));

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
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
                        // Decide if this brick should drop a bonus (every ~10 bricks)
                        bricksSinceLastBonus++;
                        if (bricksSinceLastBonus >= targetBonusInterval) {
                            b.dropType = Math.random() < 0.6 ? 'padwidth' : 'multiball';
                            bricksSinceLastBonus = 0;
                            targetBonusInterval = 8 + Math.floor(Math.random() * 5); // 8..12
                        }
                        // If this brick was chosen to drop a bonus, spawn a bonus pickup at its position
                        if (b.dropType) {
                            bonuses.push({
                                x: b.x + brickWidth / 2,
                                y: b.y + brickHeight + 4,
                                vy: 1,
                                type: b.dropType,
                                w: 32,
                                h: 10
                            });
                            b.dropType = null;
                        }
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

// Add game over buttons to DOM
let gameOverContainer = document.createElement('div');
gameOverContainer.id = 'gameOverButtons';
gameOverContainer.style.position = 'absolute';
gameOverContainer.style.left = '50%';
gameOverContainer.style.top = '50%';
gameOverContainer.style.transform = 'translate(-50%, -50%)';
gameOverContainer.style.display = 'none';
gameOverContainer.style.textAlign = 'center';
document.body.appendChild(gameOverContainer);

let mainMenuBtn = document.createElement('button');
mainMenuBtn.textContent = 'Main Menu';
mainMenuBtn.style.fontSize = '24px';
mainMenuBtn.style.padding = '12px 32px';
mainMenuBtn.style.margin = '10px';
mainMenuBtn.style.background = '#09f';
mainMenuBtn.style.color = '#fff';
mainMenuBtn.style.border = 'none';
mainMenuBtn.style.borderRadius = '4px';
mainMenuBtn.style.cursor = 'pointer';
mainMenuBtn.style.fontWeight = 'bold';
gameOverContainer.appendChild(mainMenuBtn);

let restartBtn = document.createElement('button');
restartBtn.textContent = 'Restart';
restartBtn.style.fontSize = '24px';
restartBtn.style.padding = '12px 32px';
restartBtn.style.margin = '10px';
restartBtn.style.background = '#0f0';
restartBtn.style.color = '#000';
restartBtn.style.border = 'none';
restartBtn.style.borderRadius = '4px';
restartBtn.style.cursor = 'pointer';
restartBtn.style.fontWeight = 'bold';
gameOverContainer.appendChild(restartBtn);

mainMenuBtn.addEventListener('click', function() {
    showMainMenu();
});

restartBtn.addEventListener('click', function() {
    resetGame();
    gameOverContainer.style.display = 'none';
    gameOver = false;
    draw();
});

function showGameOverButtons() {
    gameOverContainer.style.display = 'block';
}

function resetGame() {
    // Update highscore if needed
    if (score > highscore) {
        highscore = score;
        setCookie(HIGH_SCORE_COOKIE, highscore, 365);
    }
    // Reset all game variables
    score = 0;
    scoreMultiplier = 10;
    scorePopups = [];
    paddleX = (canvas.width - paddleWidth) / 2;
    // Reset balls array to single ball
    balls = [
        { x: canvas.width / 2, y: canvas.height - 50, dx: ballSpeed, dy: -ballSpeed, radius: ballRadius }
    ];
    // Reset bonuses
    bonuses = [];
    bricksSinceLastBonus = 0;
    targetBonusInterval = 10;
    // Reset paddle size
    if (padGrowActive) {
        paddleWidth = padOriginalWidth || 75;
        padOriginalWidth = null;
        padGrowActive = false;
        padGrowExpires = 0;
    }
    // Load the appropriate level based on game mode
    if (gameMode === 'custom') {
        loadLevel(0); // This will use customLevelData
    } else {
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
    // Draw top boundary line for the play area (visual cue for where the ball bounces)
    ctx.save();
    ctx.strokeStyle = 'rgba(200,200,200,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.lineTo(canvas.width, 40);
    ctx.stroke();
    ctx.restore();
    drawBricks();
    // Update and draw active bonuses (falling pickups)
    if (bonuses.length > 0) {
        const py = canvas.height - paddleHeight - 20;
        for (let i = bonuses.length - 1; i >= 0; i--) {
            const B = bonuses[i];
            // physics (slower fall speed)
            B.vy += 0.03; // slight gravity (half speed)
            B.y += B.vy;

            // draw: mini paddle icon for padwidth
            if (B.type === 'padwidth') {
                ctx.save();
                ctx.fillStyle = '#0f0';
                ctx.strokeStyle = '#003300';
                const bx = B.x - B.w / 2;
                const by = B.y - B.h / 2;
                ctx.fillRect(bx, by, B.w, B.h);
                ctx.lineWidth = 1;
                ctx.strokeRect(bx, by, B.w, B.h);
                ctx.restore();
            }

            // Check if caught by paddle
            if (B.y + B.h/2 >= py && B.y - B.h/2 <= py + paddleHeight) {
                if (B.x >= paddleX && B.x <= paddleX + paddleWidth) {
                    // Caught!
                    if (B.type === 'padwidth') {
                        // preserve center and double width
                        const center = paddleX + paddleWidth / 2;
                        // if not active, set original width
                        padOriginalWidth = padOriginalWidth || paddleWidth;
                        paddleWidth = padOriginalWidth * 2;
                        paddleX = center - paddleWidth / 2;
                        // clamp
                        if (paddleX < 0) paddleX = 0;
                        if (paddleX > canvas.width - paddleWidth) paddleX = canvas.width - paddleWidth;
                        // set/refresh timer
                        padGrowActive = true;
                        padGrowExpires = Date.now() + PAD_GROW_DURATION;
                    } else if (B.type === 'multiball') {
                        // spawn two extra balls from paddle center
                        const center = paddleX + paddleWidth / 2;
                        const spawnY = py - 10;
                        const s = Math.max(2, ballSpeed);
                        balls.push({ x: center - 10, y: spawnY, dx: -s * 0.6, dy: -Math.abs(s), radius: ballRadius });
                        balls.push({ x: center + 10, y: spawnY, dx: s * 0.6, dy: -Math.abs(s), radius: ballRadius });
                    }
                    bonuses.splice(i, 1);
                    continue;
                }
            }

            // Remove if off-screen
            if (B.y - B.h/2 > canvas.height) {
                bonuses.splice(i, 1);
            }
        }
    }
    // Draw all balls
    for (let i = 0; i < balls.length; i++) {
        drawBall(balls[i]);
    }
    drawPaddle();
    drawScorePopups();
    drawScore();
    collisionDetection();

    // Ball Movement and collision for each ball
    for (let i = balls.length - 1; i >= 0; i--) {
        const ball = balls[i];
        
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Wall Collision
        if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
            ball.dx = -ball.dx;
            // Trigger screenshake on wall hit
            shakeTimer = 4;
            shakeIntensity = 2;
        }
        if (ball.y + ball.dy < 40 + ball.radius) {
            ball.dy = -ball.dy; // Prevent ball from going into score area
        } else if (ball.y + ball.dy > canvas.height - ball.radius - 20) {
            // Paddle collision
            if (ball.x > paddleX && ball.x < paddleX + paddleWidth) {
                // Calculate hit position (-1 to 1)
                let hit = (ball.x - (paddleX + paddleWidth / 2)) / (paddleWidth / 2);
                // Set maximum bounce angle (radians, e.g. 60deg)
                let maxAngle = Math.PI / 3;
                let angle = hit * maxAngle;
                // Set speed
                let speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                ball.dx = speed * Math.sin(angle);
                ball.dy = -Math.abs(speed * Math.cos(angle));
                scoreMultiplier = 10;
            } else {
                // Ball missed paddle - remove it
                balls.splice(i, 1);
                // If no balls left, game over
                if (balls.length === 0) {
                    // Update highscore if needed
                    if (score > highscore) {
                        highscore = score;
                        setCookie(HIGH_SCORE_COOKIE, highscore, 365);
                    }
                    gameOver = true;
                    showGameOverButtons();
                    return;
                }
            }
        }
    }

    // Paddle Movement
    // Update gamepad state (if a gamepad is connected) so axes/buttons map to left/right
    updateGamepadState();
    // If an analog axis is active, use it to set paddle speed proportionally.
    if (gamepadAxis !== 0) {
        const movement = gamepadAxis * GAMEPAD_MAX_PADDLE_SPEED; // -max..+max
        paddleX += movement;
    } else if (rightPressed && paddleX < canvas.width - paddleWidth) {
        paddleX += 5;
    } else if (leftPressed && paddleX > 0) {
        paddleX -= 5;
    }

    // Clamp paddle inside canvas
    if (paddleX < 0) paddleX = 0;
    if (paddleX > canvas.width - paddleWidth) paddleX = canvas.width - paddleWidth;

    // Handle pad growth expiry
    if (padGrowActive && Date.now() >= padGrowExpires) {
        // revert to original width while preserving center
        const center = paddleX + paddleWidth / 2;
        paddleWidth = padOriginalWidth;
        paddleX = center - paddleWidth / 2;
        if (paddleX < 0) paddleX = 0;
        if (paddleX > canvas.width - paddleWidth) paddleX = canvas.width - paddleWidth;
        padGrowActive = false;
        padGrowExpires = 0;
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
    // Draw active bonus HUD (top-right)
    if (padGrowActive) {
        const ttl = Math.max(0, padGrowExpires - Date.now());
        const secs = Math.ceil(ttl / 1000);
        const hudX = canvas.width - 120;
        // small label
        ctx.font = '14px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        // draw mini paddle icon
        ctx.save();
        ctx.fillStyle = '#0f0';
        ctx.fillRect(hudX, 8, 36, 8);
        ctx.strokeStyle = '#003300';
        ctx.strokeRect(hudX, 8, 36, 8);
        ctx.restore();
        ctx.fillText('Pad x2: ' + secs + 's', hudX + 44, 16);
    }
    requestAnimationFrame(draw);
}

// Don't auto-start - wait for menu selection
// draw();

// Menu functions
function showMainMenu() {
    document.getElementById('mainMenu').style.display = 'block';
    document.getElementById('customLevelSelect').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'none';
    gameOver = true; // Stop the game loop
    gameOverContainer.style.display = 'none';
}

function showCustomLevelSelect() {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('customLevelSelect').style.display = 'block';
    document.getElementById('gameContainer').style.display = 'none';
    
    // Load custom levels from localStorage
    const customLevels = getCustomLevels();
    const levelList = document.getElementById('customLevelList');
    levelList.innerHTML = '';
    
    const levelNames = Object.keys(customLevels);
    if (levelNames.length === 0) {
        levelList.innerHTML = '<p style="color: #888;">No custom levels found. Create one in the Level Editor!</p>';
    } else {
        levelNames.forEach(name => {
            const levelItem = document.createElement('div');
            levelItem.className = 'level-item';
            levelItem.textContent = name;
            levelItem.onclick = () => startCustomLevel(name, customLevels[name]);
            levelList.appendChild(levelItem);
        });
    }
}

function getCustomLevels() {
    const data = localStorage.getItem('arkanoid_custom_levels');
    return data ? JSON.parse(data) : {};
}

function startNormalGame() {
    gameMode = 'normal';
    customLevelData = null;
    currentLevelIndex = 0;
    
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('customLevelSelect').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';
    
    resetGame();
    gameOver = false;
    draw();
}

function startCustomLevel(levelName, levelData) {
    gameMode = 'custom';
    customLevelData = levelData;
    
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('customLevelSelect').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';
    
    resetGame();
    gameOver = false;
    draw();
}

function handleAButtonPress() {
    // If the game UI is not visible (menu), start a normal game
    const gameContainer = document.getElementById('gameContainer');
    if (!gameContainer || gameContainer.style.display !== 'block') {
        // Start normal game from menu
        startNormalGame();
        return;
    }

    // If game is over, restart
    if (gameOver) {
        resetGame();
        gameOver = false;
        gameOverContainer.style.display = 'none';
        draw();
        return;
    }

    // Otherwise: no-op (could be used for launch/serve in future)
}

// Poll the gamepad state continuously (even when the main game loop is not running)
// This ensures button presses like 'A' are detected while in menus or when gameOver
function pollGamepad() {
    try {
        updateGamepadState();
    } catch (e) {
        // Defensive: don't let gamepad polling break the app
        console.error('Error while polling gamepad:', e);
    }
    requestAnimationFrame(pollGamepad);
}

// Start polling immediately
pollGamepad();
