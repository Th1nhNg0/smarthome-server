var mysql = require("mysql");
var connection = mysql.createConnection({
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

  console.log("connected as id " + connection.threadId);
});

connection.query(
  "SELECT * from temperature",
  function (error, results, fields) {
    if (error) throw error;
    console.log({ results });
  }
);

connection.end();

// // query to get housr
SELECT hour(date),minute(date), SUM(temp)/COUNT(temp)
FROM temperature
WHERE date >= '2020-12-06 03:00:00'
AND date <= '2020-12-06 03:04:00'
GROUP BY hour(date),minute(date)
