const pool = require("./dbConnections");
const bcrypt = require("bcrypt");

const createAutoRegisterDao = async (registration_link) => {
  const query = "INSERT INTO autoregister (registration_link) VALUES ($1) RETURNING *";
  const result = await pool.query(query, [registration_link]);
  return result.rows[0];
};

module.exports = { createAutoRegisterDao };