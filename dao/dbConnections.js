const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // required for Render’s managed Postgres
  },
});

pool
  .connect()
  .then((client) => {
    return client
      .query("SELECT 1")
      .then(() => {
        console.log("✅ Conectado a la base de datos en Render");
        client.release();
      })
      .catch((err) => {
        client.release();
        console.error("❌ Error al hacer consulta de prueba", err.stack);
      });
  })
  .catch((err) => {
    console.error("❌ Error al conectar a la base de datos", err.stack);
  });

module.exports = pool;
