const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

pool
  .connect()
  .then((client) => {
    return client
      .query("SELECT 1")
      .then(() => {
        console.log("Conectado a la base de datos");
        client.release();
      })
      .catch((err) => {
        client.release();
        console.error(" Error al hacer consulta de prueba", err.stack);
      });
  })
  .catch((err) => {
    console.error("Error al conectar a la base de datos", err.stack);
  });

module.exports = pool;
