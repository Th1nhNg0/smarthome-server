var express = require("express");
var app = express();
var http = require("http").createServer(app);
var io = require("socket.io")(http, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
app.use(express.static("public"));
let board_data = {
  boardIsConnected: false,
};

io.on("connection", (socket) => {
  if (!socket.handshake.query.name) {
    socket.disconnect();
    return;
  }
  socket.device_name = socket.handshake.query.name;
  if (socket.device_name == "board") board_data.boardIsConnected = true;
  console.log(`a ${socket.device_name} connected`);

  socket.on("temp_sensor", (data) => {
    io.emit("temp_sensor", data);
    console.log("RECIEVED DATA FROM BOARD", data);
  });

  socket.on("GPIO_control", (payload) => {
    io.emit("GPIO_control", payload);
    console.log("CLIENT SEND GPIO_CONTROL CMD: ", payload);
  });

  socket.on("disconnect", () => {
    console.log(`a ${socket.device_name} disconnected`);
    if (socket.device_name == "board") {
      board_data.boardIsConnected = false;
    }
  });
});

setInterval(() => io.emit("board_data", board_data), 1000 / 60);

http.listen(3000, () => {
  console.log("listening on *:3000");
});
