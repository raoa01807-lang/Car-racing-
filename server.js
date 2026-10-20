const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = new Map();

function makeCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";

    for (let i = 0; i < 5; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }

    return code;
}

io.on("connection", socket => {

    socket.on("createRoom", callback => {
        let code;

        do {
            code = makeCode();
        } while (rooms.has(code));

        rooms.set(code, new Map());

        socket.join(code);
        socket.data.room = code;

        rooms.get(code).set(socket.id, {
            id: socket.id,
            name: "Player 1",
            x: 100,
            y: 300,
            color: "#00ff88"
        });

        callback({ ok: true, code });

        io.to(code).emit("players", [...rooms.get(code).values()]);
    });

    socket.on("joinRoom", (code, callback) => {
        code = String(code || "").trim().toUpperCase();

        const room = rooms.get(code);

        if (!room) {
            return callback({
                ok: false,
                message: "Room nahi mila!"
            });
        }

        if (room.size >= 4) {
            return callback({
                ok: false,
                message: "Room full hai!"
            });
        }

        if (socket.data.room) {
            const oldRoom = socket.data.room;
            rooms.get(oldRoom)?.delete(socket.id);
            socket.leave(oldRoom);
            io.to(oldRoom).emit(
                "players",
                [...(rooms.get(oldRoom)?.values() || [])]
            );
        }

        const colors = ["#00ff88", "#ff4545", "#45a0ff", "#ffd447"];

        socket.join(code);
        socket.data.room = code;

        room.set(socket.id, {
            id: socket.id,
            name: `Player ${room.size + 1}`,
            x: 100,
            y: 300,
            color: colors[room.size]
        });

        callback({ ok: true, code });

        io.to(code).emit("players", [...room.values()]);
    });

    socket.on("move", data => {
        const code = socket.data.room;
        const room = rooms.get(code);
        const player = room?.get(socket.id);

        if (!player || !data) return;

        player.x = Math.max(15, Math.min(215, Number(data.x) || 15));
        player.y = Math.max(30, Math.min(340, Number(data.y) || 30));

        socket.to(code).emit("playerMoved", {
            id: socket.id,
            x: player.x,
            y: player.y
        });
    });

    socket.on("disconnect", () => {
        const code = socket.data.room;
        const room = rooms.get(code);

        if (!room) return;

        room.delete(socket.id);

        if (room.size === 0) {
            rooms.delete(code);
        } else {
            io.to(code).emit("players", [...room.values()]);
        }
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
