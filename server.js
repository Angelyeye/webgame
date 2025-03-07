const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// 服务静态文件
app.use(express.static('public'));

// 游戏状态管理
const gameRooms = new Map();
let waitingPlayer = null;

// 游戏主循环
function updateGame(roomId) {
    const gameState = gameRooms.get(roomId);
    if (!gameState) return;

    // 更新每个玩家的蛇位置
    gameState.players.forEach(player => {
        const head = {...player.snake[0]};

        // 根据方向移动蛇头
        switch (player.direction) {
            case 'up': head.y = head.y - 1; break;
            case 'down': head.y = head.y + 1; break;
            case 'left': head.x = head.x - 1; break;
            case 'right': head.x = head.x + 1; break;
        }

        // 检查是否吃到食物
        if (head.x === gameState.food.x && head.y === gameState.food.y) {
            player.score += 1;
            // 生成新的食物
            gameState.food = {
                x: Math.floor(Math.random() * 20),
                y: Math.floor(Math.random() * 20)
            };
        } else {
            player.snake.pop();
        }

        // 检查碰撞
        const otherPlayer = gameState.players.find(p => p.id !== player.id);
        if (!otherPlayer) return;

        // 检查是否撞墙
        if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20) {
            io.to(roomId).emit('gameOver', { winner: otherPlayer.id });
            clearInterval(gameState.interval);
            gameRooms.delete(roomId);
            return;
        }

        const hitSelf = player.snake.slice(1).some(segment => 
            segment.x === head.x && segment.y === head.y
        );
        const hitOther = otherPlayer.snake.some(segment =>
            segment.x === head.x && segment.y === head.y
        );

        if (hitSelf || hitOther) {
            const winner = hitSelf ? otherPlayer.id : player.id;
            io.to(roomId).emit('gameOver', { winner });
            clearInterval(gameState.interval);
            gameRooms.delete(roomId);
            return;
        }

        // 更新蛇的位置
        player.snake.unshift(head);
    });

    // 发送更新后的游戏状态
    const cleanGameState = {
        players: gameState.players.map(({ id, snake, direction, score }) => ({
            id, snake, direction, score
        })),
        food: gameState.food
    };
    io.to(roomId).emit('gameStateUpdate', cleanGameState);
}

// Socket.io连接处理
io.on('connection', (socket) => {
    console.log('用户已连接:', socket.id);

    // 玩家加入匹配队列
    socket.on('joinGame', () => {
        if (!waitingPlayer) {
            waitingPlayer = socket.id;
            socket.emit('waiting');
        } else {
            // 创建新游戏房间
            const roomId = Math.random().toString(36).substring(7);
            const gameState = {
                players: [
                    {
                        id: waitingPlayer,
                        snake: [{x: 5, y: 5}],
                        direction: 'right',
                        score: 0
                    },
                    {
                        id: socket.id,
                        snake: [{x: 15, y: 15}],
                        direction: 'left',
                        score: 0
                    }
                ],
                food: {
                    x: Math.floor(Math.random() * 20),
                    y: Math.floor(Math.random() * 20)
                }
            };

            // 通知两个玩家游戏开始
            const waitingSocket = io.sockets.sockets.get(waitingPlayer);
            if (waitingSocket) {
                waitingSocket.join(roomId);
                socket.join(roomId);

                // 启动游戏循环
                const gameInterval = setInterval(() => updateGame(roomId), 400);

                // 存储游戏状态和定时器
                gameRooms.set(roomId, {
                    ...gameState,
                    interval: gameInterval
                });

                io.to(roomId).emit('gameStart', {
                    roomId: roomId,
                    gameState: gameState
                });

                waitingPlayer = null;
            } else {
                socket.emit('waiting');
                waitingPlayer = socket.id;
            }
        }
    });

    // 处理玩家移动
    socket.on('move', (data) => {
        const gameState = gameRooms.get(data.roomId);
        if (!gameState) return;

        const player = gameState.players.find(p => p.id === socket.id);
        if (player) {
            // 检查新方向是否与当前方向相反
            const oppositeDirections = {
                'up': 'down',
                'down': 'up',
                'left': 'right',
                'right': 'left'
            };
            
            if (oppositeDirections[data.direction] !== player.direction) {
                player.direction = data.direction;
            }
        }
    });

    // 处理断开连接
    socket.on('disconnect', () => {
        console.log('用户断开连接:', socket.id);
        if (waitingPlayer === socket.id) {
            waitingPlayer = null;
        }
        // 处理游戏房间中的断开连接
        gameRooms.forEach((state, roomId) => {
            const player = state.players.find(p => p.id === socket.id);
            if (player) {
                clearInterval(state.interval);
                const winner = state.players.find(p => p.id !== socket.id);
                if (winner) {
                    io.to(roomId).emit('gameOver', { winner: winner.id });
                }
                gameRooms.delete(roomId);
            }
        });
    });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});