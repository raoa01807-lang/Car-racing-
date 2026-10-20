const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let players = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Assign player role (Player 1 or Player 2)
    if (Object.keys(players).length === 0) {
        players[socket.id] = { id: socket.id, role: 'p1', x: 100, y: 300, health: 100, fuel: 100, facing: 1, color: '#3b5c22' };
        socket.emit('assigned', 'p1');
    } else if (Object.keys(players).length === 1) {
        players[socket.id] = { id: socket.id, role: 'p2', x: 680, y: 300, health: 100, fuel: 100, facing: -1, color: '#2c4c75' };
        socket.emit('assigned', 'p2');
    } else {
        socket.emit('full'); // Room full
    }

    // Listen for player movement/actions
    socket.on('playerData', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].health = data.health;
            players[socket.id].fuel = data.fuel;
            players[socket.id].facing = data.facing;
        }
    });

    socket.on('shoot', (bulletData) => {
        socket.broadcast.emit('enemyShoot', bulletData);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

// Send game state to all clients 60 times a second
setInterval(() => {
    io.emit('currentPlayers', players);
}, 1000 / 60);

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
