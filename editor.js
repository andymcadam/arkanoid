const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');

// Grid settings (match game settings)
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_WIDTH = 50;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 1;
const OFFSET_LEFT = 30;
const OFFSET_TOP = 30;

// Row colors (match game colors)
const rowColors = ["#f00", "#fa0", "#ff0", "#0f0", "#0ff"];

// Grid state
let grid = [];

// Initialize empty grid
function initGrid() {
    grid = [];
    for (let c = 0; c < BRICK_COLS; c++) {
        grid[c] = [];
        for (let r = 0; r < BRICK_ROWS; r++) {
            grid[c][r] = 0;
        }
    }
}

// Color helper functions (from arkanoid.js)
function hexToRgb(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3) {
        h = h.split('').map(ch => ch + ch).join('');
    }
    const bigint = parseInt(h, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function shadeColor(hex, percent) {
    const { r, g, b } = hexToRgb(hex);
    const amt = Math.round(2.55 * percent);
    const nr = Math.max(0, Math.min(255, r + amt));
    const ng = Math.max(0, Math.min(255, g + amt));
    const nb = Math.max(0, Math.min(255, b + amt));
    return `rgb(${nr},${ng},${nb})`;
}

function makeBrickGradient(x, y, w, h, baseColor) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, shadeColor(baseColor, 22));
    g.addColorStop(0.5, baseColor);
    g.addColorStop(1, shadeColor(baseColor, -18));
    return g;
}

// Draw the grid
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background grid lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let c = 0; c <= BRICK_COLS; c++) {
        const x = c * (BRICK_WIDTH + BRICK_PADDING) + OFFSET_LEFT;
        ctx.beginPath();
        ctx.moveTo(x, OFFSET_TOP);
        ctx.lineTo(x, OFFSET_TOP + BRICK_ROWS * (BRICK_HEIGHT + BRICK_PADDING));
        ctx.stroke();
    }
    for (let r = 0; r <= BRICK_ROWS; r++) {
        const y = r * (BRICK_HEIGHT + BRICK_PADDING) + OFFSET_TOP;
        ctx.beginPath();
        ctx.moveTo(OFFSET_LEFT, y);
        ctx.lineTo(OFFSET_LEFT + BRICK_COLS * (BRICK_WIDTH + BRICK_PADDING), y);
        ctx.stroke();
    }
    
    // Draw bricks
    for (let c = 0; c < BRICK_COLS; c++) {
        for (let r = 0; r < BRICK_ROWS; r++) {
            const brickX = c * (BRICK_WIDTH + BRICK_PADDING) + OFFSET_LEFT;
            const brickY = r * (BRICK_HEIGHT + BRICK_PADDING) + OFFSET_TOP;
            const baseColor = rowColors[BRICK_ROWS - 1 - r] || "#999";
            
            if (grid[c][r] === 1) {
                // Draw filled brick with gradient
                ctx.fillStyle = makeBrickGradient(brickX, brickY, BRICK_WIDTH, BRICK_HEIGHT, baseColor);
                ctx.fillRect(brickX, brickY, BRICK_WIDTH, BRICK_HEIGHT);
                
                // Highlight
                ctx.beginPath();
                ctx.strokeStyle = shadeColor(baseColor, 40);
                ctx.lineWidth = 2;
                ctx.moveTo(brickX + 1, brickY + 1);
                ctx.lineTo(brickX + BRICK_WIDTH - 1, brickY + 1);
                ctx.moveTo(brickX + 1, brickY + 1);
                ctx.lineTo(brickX + 1, brickY + BRICK_HEIGHT - 1);
                ctx.stroke();
                
                // Shadow
                ctx.beginPath();
                ctx.strokeStyle = shadeColor(baseColor, -38);
                ctx.lineWidth = 2;
                ctx.moveTo(brickX + 1, brickY + BRICK_HEIGHT - 1);
                ctx.lineTo(brickX + BRICK_WIDTH - 1, brickY + BRICK_HEIGHT - 1);
                ctx.moveTo(brickX + BRICK_WIDTH - 1, brickY + 1);
                ctx.lineTo(brickX + BRICK_WIDTH - 1, brickY + BRICK_HEIGHT - 1);
                ctx.stroke();
            } else {
                // Draw empty cell with faint color
                ctx.fillStyle = 'rgba(100, 100, 100, 0.2)';
                ctx.fillRect(brickX, brickY, BRICK_WIDTH, BRICK_HEIGHT);
            }
        }
    }
}

// Handle canvas click
canvas.addEventListener('click', function(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate which brick was clicked
    const col = Math.floor((x - OFFSET_LEFT) / (BRICK_WIDTH + BRICK_PADDING));
    const row = Math.floor((y - OFFSET_TOP) / (BRICK_HEIGHT + BRICK_PADDING));
    
    if (col >= 0 && col < BRICK_COLS && row >= 0 && row < BRICK_ROWS) {
        // Toggle brick
        grid[col][row] = grid[col][row] === 1 ? 0 : 1;
        drawGrid();
    }
});

// Clear all bricks
function clearLevel() {
    initGrid();
    drawGrid();
}

// Fill all bricks
function fillLevel() {
    for (let c = 0; c < BRICK_COLS; c++) {
        for (let r = 0; r < BRICK_ROWS; r++) {
            grid[c][r] = 1;
        }
    }
    drawGrid();
}

// Random level
function randomLevel() {
    for (let c = 0; c < BRICK_COLS; c++) {
        for (let r = 0; r < BRICK_ROWS; r++) {
            grid[c][r] = Math.random() > 0.5 ? 1 : 0;
        }
    }
    drawGrid();
}

// Convert grid to CSV format
function gridToCSV() {
    let csv = '';
    for (let r = 0; r < BRICK_ROWS; r++) {
        const row = [];
        for (let c = 0; c < BRICK_COLS; c++) {
            row.push(grid[c][r]);
        }
        csv += row.join(',') + '\n';
    }
    return csv;
}

// Convert CSV to grid
function csvToGrid(csv) {
    const rows = csv.trim().split('\n');
    initGrid();
    for (let r = 0; r < Math.min(rows.length, BRICK_ROWS); r++) {
        const cols = rows[r].split(',').map(s => parseInt(s.trim(), 10) || 0);
        for (let c = 0; c < Math.min(cols.length, BRICK_COLS); c++) {
            grid[c][r] = cols[c] === 1 ? 1 : 0;
        }
    }
}

// Save level to localStorage
function saveLevel() {
    const levelName = document.getElementById('levelName').value.trim();
    if (!levelName) {
        alert('Please enter a level name');
        return;
    }
    
    const csv = gridToCSV();
    const levels = getCustomLevels();
    levels[levelName] = csv;
    localStorage.setItem('arkanoid_custom_levels', JSON.stringify(levels));
    
    alert('Level saved: ' + levelName);
    displayCustomLevels();
}

// Get all custom levels from localStorage
function getCustomLevels() {
    const data = localStorage.getItem('arkanoid_custom_levels');
    return data ? JSON.parse(data) : {};
}

// Load level from localStorage
function loadLevel(levelName) {
    const levels = getCustomLevels();
    const csv = levels[levelName];
    if (csv) {
        csvToGrid(csv);
        drawGrid();
        document.getElementById('levelName').value = levelName;
    }
}

// Delete level from localStorage
function deleteLevel(levelName) {
    if (confirm('Delete level "' + levelName + '"?')) {
        const levels = getCustomLevels();
        delete levels[levelName];
        localStorage.setItem('arkanoid_custom_levels', JSON.stringify(levels));
        displayCustomLevels();
    }
}

// Display custom levels list
function displayCustomLevels() {
    const levels = getCustomLevels();
    const list = document.getElementById('customLevels');
    list.innerHTML = '';
    
    const levelNames = Object.keys(levels);
    if (levelNames.length === 0) {
        list.innerHTML = '<li style="text-align: center; color: #888;">No saved levels yet</li>';
        return;
    }
    
    levelNames.forEach(name => {
        const li = document.createElement('li');
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        
        const buttonContainer = document.createElement('div');
        
        const loadBtn = document.createElement('button');
        loadBtn.textContent = 'Load';
        loadBtn.className = 'secondary';
        loadBtn.onclick = () => loadLevel(name);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'danger';
        deleteBtn.onclick = () => deleteLevel(name);
        
        buttonContainer.appendChild(loadBtn);
        buttonContainer.appendChild(deleteBtn);
        
        li.appendChild(nameSpan);
        li.appendChild(buttonContainer);
        list.appendChild(li);
    });
}

// Export level as CSV file
function exportCSV() {
    const levelName = document.getElementById('levelName').value.trim() || 'custom_level';
    const csv = gridToCSV();
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = levelName + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Initialize
initGrid();
drawGrid();
displayCustomLevels();
