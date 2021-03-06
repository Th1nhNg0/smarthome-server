const express = require("express");
const app = express();
const http = require("http").createServer(app);
const mysql = require("mysql");
require("dotenv").config();

const connection = mysql.createPool({
  host: process.env.DBHOST,
  user: process.env.DBUSER,
  password: process.env.DBPASS,
  database: process.env.DBDATABASE,
});

connection.query(
  "CREATE TABLE IF NOT EXISTS `temperature` (`date` timestamp NOT NULL DEFAULT current_timestamp(),`temp` double NOT NULL,`room_id` int(11) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
  function (error, results, fields) {
    if (error) throw error;
    console.log("connected to database");
  }
);

const io = require("socket.io")(http, {});
app.use(express.static("public"));

app.get("/googleassistant", (req, res) => {
  res.send("ok");
});

let board_data = {
  boardIsConnected: false,
  temp: {},
  data: {
    GPIO: {},
  },
  temp_control: {
    enable: false,
    value: 30,
    state: false,
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
    io.emit("temp_sensor", data);
    let id = data.id;
    if (id == 1) {
      if (board_data.temp_control.enable) {
        let state = board_data.temp_control.state;
        let new_state = false;
        if (state) {
          new_state = data.value > board_data.temp_control.value - 1;
        } else {
          new_state = data.value - board_data.temp_control.value > 1;
        }
        board_data.temp_control.state = new_state;
        io.emit("temp_control", new_state);
      } else io.emit("temp_control", 0);
    }
    let query = `INSERT INTO temperature (date,temp, room_id) VALUES ('${data.date}',${data.value},${id})`;
    if (!board_data.temp[id]) {
      board_data.temp[id] = {};
      board_data.temp[id].lastUpdate = new Date(data.date);
    }
    if (
      new Date(data.date) - new Date(board_data.temp[id].lastUpdate) >=
      3000
    ) {
      board_data.temp[id].lastUpdate = new Date(data.date);
      if (data.value > 40) {
        board_data.temp[id].status = 2;
      } else if (
        board_data.temp[id] &&
        data.value - board_data.temp[id].value > 2
      ) {
        board_data.temp[id].status = 1;
      } else {
        board_data.temp[id].status = 0;
      }
      board_data.temp[id].value = data.value;
    }
    connection.query(query, function (error, results, fields) {
      if (error) throw error;
    });
    let alert = false;
    for (let x in board_data.temp)
      if (board_data.temp[x].status == 2) alert = true;
    io.emit("alert", alert);
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
  socket.on("door", (data) => {
    console.log("DOOR:", data);
    io.emit("door", data);
  });
  socket.on("GPIO_control", (payload) => {
    io.emit("GPIO_control", payload);
    console.log("CLIENT SEND GPIO_CONTROL CMD: ", payload);
  });
  socket.on("temp_control_toggle", () => {
    board_data.temp_control.enable = !board_data.temp_control.enable;
    console.log("temp-control-enable:", board_data.temp_control.enable);
  });
  socket.on("temp_control_value", (value) => {
    board_data.temp_control.value += value;
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
}, 1000 / 60);

http.listen(process.env.PORT || 3000, () => {
  console.log("listening on *:", process.env.PORT || 3000);
});
