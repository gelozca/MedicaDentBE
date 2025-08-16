const pool = require("./dbConnections");
const bcrypt = require("bcrypt");

const getUsuarios = async () => {
  try {
    const query = "SELECT * FROM usuarios";
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error("Error al obtener los usuarios", error);
    throw error;
  }
};

const getUsuarioById = async (id) => {
  try {
    const query = "SELECT * FROM usuarios WHERE id = $1";
    const result = await pool.query(query, [id]);
    return result.rows[0];
  } catch (error) {
    console.error("Error al obtener el usuario", error);
    throw error;
  }
};

const createUsuarioDao = async (usuario) => {
  try {
    const { username, email, password, rol_id } = usuario;
    const passwordHash = await bcrypt.hash(password, 10);
    const query =
      "INSERT INTO usuarios (username, password_hash, email, rol_id, activo) VALUES ($1, $2, $3, $4, $5) RETURNING *";
    const result = await pool.query(query, [
      username,
      passwordHash,
      email,
      rol_id,
      true,
    ]);
    return result.rows[0];
  } catch (error) {
    console.error("Error al crear el usuario", error);
    throw error;
  }
};

const getUsuarioByEmail = async (email) => {
  try {
    const query = "SELECT * FROM usuarios WHERE email = $1";
    const result = await pool.query(query, [email]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};
const getUsuarioByUsername = async (username) => {
  try {
    const query = "SELECT * FROM usuarios WHERE username = $1";
    const result = await pool.query(query, [username]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const getRoleById = async (id) => {
  try {
    const query = "SELECT * FROM roles WHERE id = $1";
    const result = await pool.query(query, [id]);
    return result.rows[0];
  } catch (error) {
    console.error("Error al obtener el rol", error);
    throw error;
  }
};

const updatePasswordDao = async (id, password) => {
  try {    
    const query = "UPDATE usuarios SET password_hash = $1 WHERE id = $2";
    await pool.query(query, [password, id]);
    return true;
  } catch (error) {
    console.error("Error al actualizar el password", error);
    throw error;
  }
};

module.exports = {
  getUsuarios,
  getUsuarioById,
  createUsuarioDao,
  getUsuarioByEmail,
  getUsuarioByUsername,
  getRoleById,
  updatePasswordDao,
};
