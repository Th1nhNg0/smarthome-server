const express = require("express");
const app = express();
const http = require("http").createServer(app);
const mysql = require("mysql");
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "smarthouse",
});

connection.connect(function (err) {
  if (err) {
    console.error("error connecting: " + err.stack);
    return;
  }
  console.log("connected to database");
});

const io = require("socket.io")(http, {
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
    connection.query(
      `INSERT INTO temperature (date,temp, room_id) VALUES ('${data[0].date}',${data[0].value},1),
      ('${data[1].date}',${data[1].value},2),
      ('${data[2].date}',${data[2].value},3),
      ('${data[3].date}',${data[3].value},4)`,
      function (error, results, fields) {
        if (error) throw error;
        console.log("add temp to database", data);
      }
    );
  });
  socket.on("temp_data", (payload) => {
    let query = `SELECT room_id,date, SUM(temp)/COUNT(temp) as value
    FROM temperature
    WHERE date >= '${payload.start_date}'
    AND date <= '${payload.end_date}'
    AND room_id = ${payload.room_id}
    GROUP BY `;
    let group_by = ["month", "day", "hour", "minute", "second"];
    for (let x of group_by) {
      query += x + "(date)";
      if (x == payload.type) break;
      query += ",";
    }
    connection.query(query, function (error, results, fields) {
      if (error) throw error;
      socket.emit("temp_data", results);
    });
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

setInterval(() => io.emit("board_data", board_data), 1000 / 10);

http.listen(3000, () => {
  console.log("listening on *:3000");
});
