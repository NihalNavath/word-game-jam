import express from "express";
import fs from "fs"
import { Server } from "socket.io";
import { createServer } from "http";
import {join, dirname} from "path"
import { fileURLToPath } from 'url';
import e from "express";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const httpServer = createServer(app);
const io = new Server(httpServer)

// statics
app.use(express.static(join(__dirname, "public"), { extensions: ["html"] }));
console.log(join(__dirname, "public"))
const root = join(__dirname, "public");

let userNames = []

// middleware to parse incoming request
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = 3000;

//only have one room for now, TODO: expand.
let sentence = {
    roomid: { message: "" }
};
let turn = 0;

app.get("/", (req, res) => {
    res.sendFile("menu.html", {root});
})

app.get("/play", (req, res) => {
    res.sendFile("game.html", {root: join(root, "game")});
})

const isValidUsername = (username) => {
    username = username?.trim();
    if (!username || typeof username !== "string" || username.trim() === "") {
        return { valid: false, username, message: "Please provide a username." };
    }
    else if (userNames.includes(username)){
        return {valid: false, username, message: "Oops that username is already taken."};  
    } else if (username.length > 32){
        return {valid: false, username, message: "Username too long! Please choose a smaller one."};  
    }
    return {valid: true, username}
}

const prerequisite = (socket) => {
    const result = isValidUsername(socket.handshake.auth.username);
    if (!result.valid){
        const err = new Error(result.message);
        err.data = {userNameRelated: true};
        throw err;
    }

    return true;
}

io.use((socket, next) => {
    try{
        prerequisite(socket);
        next();
    } catch(err){
        next(err);
    }
})

io.on("connection", (socket) => {
    const username = socket.handshake.auth.username
    prerequisite(socket);

	console.log(`A user joined! ${username}`);
    userNames.push(username)

    socket.on("message", (message) => {
        console.log(sentence)
        message = message.trim();

        if (message === "") {
			return;
		}

        if (userNames[turn] != username){
            socket.emit("turn-error", "Please wait for your turn!");
            return
        }

        console.log("new message:- " + message)
        sentence["roomid"].message += `${message} `;
        
        nextTurn()

        console.log("after message and adding", sentence)
        io.sockets.emit("new-word", sentence["roomid"].message);

        if (sentence["roomid"].message.length >= 150){
            console.log("resetting");
            sentence["roomid"].message = "";
        }
    })

    socket.on("disconnect", (reason) => {
        if (userNames.includes(username)){
            console.log("dc from " + username)
            userNames = userNames.filter(item => item !== username)
            console.log("online players:=", userNames)
        }
    });
});

let timer = 30;
const chancer = () => {
    //console.log("timer:- " + timer + userNames[turn])
    timer -= 1
    if (timer <= 0){
        timer = 30;
        nextTurn()
    }

    const message = `${timer} seconds - ${userNames[turn]}'s turn!`
    io.sockets.emit("update-timer", { timer, turnUser: userNames[turn] });
}
setInterval(chancer, 1000);

const nextTurn = () => {
    turn += 1;
    timer = 30;
    if (turn >= userNames.length) {
        turn = 0;
    }
    return turn;
}

app.get("/api/playercount", (req, res) => {
    res.json({count: userNames.length})
})

app.get("/api/sentence", (req, res) => {
    res.json({sentence: sentence["roomid"].message})
})

const wordsFilePath = join(root, "data", "words.json");
const getRandomWords = (count = 5) => {
    try {
        const data = fs.readFileSync(wordsFilePath, "utf8");
        const words = JSON.parse(data).words;

        // Shuffle and pick 'count' words
        return words.sort(() => Math.random() - 0.5).slice(0, count);
    } catch (error) {
        console.error("Error reading words.json:", error);
        return [];
    }
};

app.get("/api/suggestions", (req, res) => {
    const count = parseInt(req.query.count) || 5; // Default to 5 words
    res.json({ suggestions: getRandomWords(count) });
});

httpServer.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});