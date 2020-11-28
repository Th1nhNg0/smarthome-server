var app = require("express")();
var http = require("http").createServer(app);
var io = require("socket.io")(http);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

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

  socket.on("disconnect", () => {
    console.log(`a ${socket.device_name} disconnected`);
  });
});

setInterval(() => io.emit("board_data", board_data), 1000 / 60);

http.listen(3000, () => {
  console.log("listening on *:3000");
});
