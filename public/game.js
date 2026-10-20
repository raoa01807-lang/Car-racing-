const socket = io();

const statusText = document.getElementById("status");
const roomInput = document.getElementById("roomCode");
const carsBox = document.getElementById("cars");
const countText = document.getElementById("count");

let roomCode = "";
let myId = "";
let x = 100;
let y = 300;
let joined = false;

const players = new Map();

socket.on("connect", () => {
    myId = socket.id;
    statusText.textContent = "Connected! Create ya join room.";
});

socket.on("disconnect", () => {
    joined = false;
    statusText.textContent = "Connection lost. Reconnecting...";
});

document.getElementById("create").onclick = () => {
    socket.emit("createRoom", result => {
        if (!result.ok) {
            statusText.textContent = "Room create nahi hua.";
            return;
        }

        roomCode = result.code;
        roomInput.value = roomCode;
        joined = true;
        statusText.textContent = "Room code: " + roomCode;
    });
};

document.getElementById("join").onclick = () => {
    const code = roomInput.value.trim().toUpperCase();

    if (!code) {
        statusText.textContent = "Room code likho!";
        return;
    }

    socket.emit("joinRoom", code, result => {
        if (!result.ok) {
            statusText.textContent = result.message;
            return;
        }

        roomCode = result.code;
        joined = true;
        statusText.textContent = "Race room joined: " + roomCode;
    });
};

socket.on("players", list => {
    players.clear();

    for (const p of list) {
        players.set(p.id, p);
    }

    countText.textContent = players.size;
    renderCars();
});

socket.on("playerMoved", data => {
    const player = players.get(data.id);

    if (player) {
        player.x = data.x;
        player.y = data.y;
        renderCars();
    }
});

function renderCars() {
    for (const [id, p] of players) {
        let car = document.getElementById("car-" + id);

        if (!car) {
            car = document.createElement("div");
            car.className = "car";
            car.id = "car-" + id;
            carsBox.appendChild(car);
        }

        car.style.background = p.color;
        car.style.left = p.x + "px";
        car.style.top = p.y + "px";
        car.title = p.name;
    }

    for (const car of [...carsBox.children]) {
        const id = car.id.slice(4);

        if (!players.has(id)) {
            car.remove();
        }
    }
}

function move(dx, dy) {
    if (!joined || !socket.connected) return;

    x = Math.max(15, Math.min(215, x + dx));
    y = Math.max(10, Math.min(325, y + dy));

    const mine = players.get(myId);

    if (mine) {
        mine.x = x;
        mine.y = y;
        renderCars();
    }

    socket.emit("move", { x, y });
}

document.getElementById("left").onclick = () => move(-15, 0);
document.getElementById("right").onclick = () => move(15, 0);
document.getElementById("up").onclick = () => move(0, -15);
document.getElementById("down").onclick = () => move(0, 15);

document.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft") move(-10, 0);
    if (event.key === "ArrowRight") move(10, 0);
    if (event.key === "ArrowUp") move(0, -10);
    if (event.key === "ArrowDown") move(0, 10);
});
