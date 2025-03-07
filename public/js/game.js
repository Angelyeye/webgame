import { snakeHeadImage } from './snake-head.js';

const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const statusDiv = document.getElementById('status');
const score1Span = document.getElementById('score1');
const score2Span = document.getElementById('score2');

const GRID_SIZE = 20;
const CELL_SIZE = canvas.width / GRID_SIZE;

let gameState = null;
let roomId = null;
let playerId = null;

// 渲染函数
function render() {
    if (!gameState) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制网格
    ctx.strokeStyle = '#eee';
    for (let i = 0; i < GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.stroke();
    }

    // 绘制食物
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(
        gameState.food.x * CELL_SIZE,
        gameState.food.y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE
    );

    // 绘制蛇
    gameState.players.forEach(player => {
        // 根据是否是当前玩家来决定蛇的颜色和样式
        const isCurrentPlayer = player.id === socket.id;
        ctx.fillStyle = isCurrentPlayer ? '#2196F3' : '#FF0000';
        
        // 遍历蛇的每个部分
        player.snake.forEach((segment, index) => {
            if (isCurrentPlayer && index === 0) {
                // 为当前玩家绘制蛇头图片
                ctx.save();
                const x = segment.x * CELL_SIZE;
                const y = segment.y * CELL_SIZE;
                
                // 根据移动方向设置旋转角度
                ctx.translate(x + CELL_SIZE/2, y + CELL_SIZE/2);
                switch(player.direction) {
                    case 'up': ctx.rotate(-Math.PI/2); break;
                    case 'down': ctx.rotate(Math.PI/2); break;
                    case 'left': ctx.rotate(Math.PI); break;
                    case 'right': ctx.rotate(0); break;
                }
                ctx.drawImage(snakeHeadImage, -CELL_SIZE/2, -CELL_SIZE/2, CELL_SIZE, CELL_SIZE);
                ctx.restore();
            } else {
                // 绘制蛇身
                ctx.fillRect(
                    segment.x * CELL_SIZE,
                    segment.y * CELL_SIZE,
                    CELL_SIZE,
                    CELL_SIZE
                );
            }
        });

    });
}

// 键盘控制
document.addEventListener('keydown', (e) => {
    if (!gameState || !roomId) return;

    const directions = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right',
        'w': 'up',
        'W': 'up',
        's': 'down',
        'S': 'down',
        'a': 'left',
        'A': 'left',
        'd': 'right',
        'D': 'right'
    };

    if (directions[e.key]) {
        socket.emit('move', {
            roomId: roomId,
            direction: directions[e.key]
        });
    }
});

// Socket.io事件处理
startBtn.addEventListener('click', () => {
    startBtn.disabled = true;
    socket.emit('joinGame');
});

socket.on('waiting', () => {
    statusDiv.textContent = '等待其他玩家加入...';
});

socket.on('gameStart', (data) => {
    roomId = data.roomId;
    gameState = data.gameState;
    playerId = socket.id;
    statusDiv.textContent = '游戏开始！';
    startBtn.style.display = 'none';
});

socket.on('gameStateUpdate', (newState) => {
    gameState = newState;
    // 更新分数显示
    score1Span.textContent = gameState.players[0].score;
    score2Span.textContent = gameState.players[1].score;
    render();
});

socket.on('gameOver', (data) => {
    const isWinner = data.winner === socket.id;
    statusDiv.textContent = isWinner ? '你赢了！' : '你输了！';
    startBtn.style.display = 'block';
    startBtn.disabled = false;
    gameState = null;
    roomId = null;
});

// 游戏循环
setInterval(render, 1000 / 30); // 30 FPS