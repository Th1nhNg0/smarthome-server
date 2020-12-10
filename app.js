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
  temp: {},
  data: {
    GPIO: {},
  },
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
    if (data.length == 0) return;
    io.emit("temp_sensor", data);
    let query = `INSERT INTO temperature (date,temp, room_id) VALUES `;
    for (let i = 0; i < data.length; i++) {
      if (data[i].value > 40) {
        board_data.temp[i].status = 2;
      } else if (
        board_data.temp[i] &&
        data[i].value - board_data.temp[i].value > 3 &&
        new Date(data[i].date) - new Date(board_data.temp[i].date) <= 5000
      ) {
        board_data.temp[i].status = 1;
      } else {
        if (!board_data.temp[i]) {
          board_data.temp[i] = {};
        }
        board_data.temp[i].status = 0;
      }
      board_data.temp[i].value = data[i].value;
      board_data.temp[i].date = data[i].date;
      query += `('${data[i].date}',${data[i].value},${i + 1})`;
      if (i < data.length - 1) query += ",";
    }
    connection.query(query, function (error, results, fields) {
      if (error) throw error;
      console.log("add temp to database", data);
    });
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
  socket.on("board_data", (data) => {
    board_data.data = data;
  });
});

setInterval(() => {
  io.emit("board_data", board_data);
}, 1000);

http.listen(process.env.PORT || 3000, () => {
  console.log("listening on *:", process.env.PORT || 3000);
});
