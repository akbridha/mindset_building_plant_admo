const mysql = require("mysql2/promise");
const db = mysql.createPool({
  host: "localhost",
  user: "rootplt",
  password: "PLT,./7788()__db",
  database: "telegram_db_01",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = { db };