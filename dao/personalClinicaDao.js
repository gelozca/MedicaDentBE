const pool = require("./dbConnections");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");

const getPersonalClinicaDao = async () => {
  try {
    const result = await pool.query("Select t1.username, t2.* From usuarios AS t1 INNER JOIN personal_clinica AS t2 ON t1.id = t2.usuario_id");
    return result.rows;
  } catch (error) {
    console.error("Error al obtener el personal de la clínica", error);
    throw error;
  }
};

const getPersonalClinicaByIdDao = async (id) => {
  try {
    const result = await pool.query(
      "SELECT * FROM personal_clinica WHERE id = $1",
      [id]
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error al obtener el personal de la clínica", error);
    throw error;
  }
};

const createPersonalClinicaDao = async (personalClinica) => {
  try {
    const {
      username,
      password_hash,
      email,
      rol_id,
      nombre,
      apellido_paterno,
      apellido_materno,
      fecha_nacimiento,
      num_telefono,
      correo, // perfil email
      direccion,
      puesto,
      especialidad,
      numero_licencia,
    } = personalClinica;

    const passwordHash = await bcrypt.hash(password_hash, 10);

    console.log(personalClinica);

    const result = await pool.query(
      `SELECT * FROM crear_usuario_personal_clinica(
          $1, $2, $3, $4,  -- usuario fields
          $5, $6, $7, $8,  -- nombre, apellidos, fecha
          $9, $10, $11, $12, -- telefono, correo_perfil, direccion, puesto
          $13, $14 -- especialidad, numero_licencia
        )`,
      [
        username,
        passwordHash,
        email,
        rol_id,
        nombre,
        apellido_paterno,
        apellido_materno,
        fecha_nacimiento,
        num_telefono,
        correo,
        direccion,
        puesto,
        especialidad,
        numero_licencia,
      ]
    );

    return {
      usuario_id: result.rows[0].usuario_id,
      personal_id: result.rows[0].personal_id,
    };
  } catch (error) {
    console.error("Error al crear usuario y personal_clinica:", error);
    throw error;
  }
};

const getPersonalClinicaByEmailDao = async (email) => {
  try {
    const result = await pool.query(
      "SELECT * FROM personal_clinica WHERE correo = $1",
      [email]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error(
      "Error al obtener el personal de la clínica por correo",
      error
    );
    throw error;
  }
};

const getPersonalClinicaByTelefonoDao = async (num_telefono) => {
  try {
    const result = await pool.query(
      "SELECT * FROM personal_clinica WHERE num_telefono = $1",
      [num_telefono]
    );
    return result.rows[0];
  } catch (error) {
    console.error(
      "Error al obtener el personal de la clínica por telefono",
      error
    );
    throw error;
  }
};

const getPersonalClinicaByRolIdDao = async (rol_id) => {
  try {
    const result = await pool.query(
      "SELECT pc.* FROM personal_clinica pc INNER JOIN usuarios u ON pc.usuario_id = u.id INNER JOIN roles r ON u.rol_id = r.id WHERE r.id = $1",
      [rol_id]
    );
    return result.rows;
  } catch (error) {
    console.error(
      "Error al obtener el personal de la clínica por puesto",
      error
    );
    throw error;
  }
};

const getPersonalClinicaByUsernameDao = async (username) => {
  try {
    const result = await pool.query("SELECT * FROM personal_clinica WHERE username = $1", [username]);
    return result.rows[0];
  } catch (error) {
    console.error("Error al obtener el personal de la clínica por username", error);
    throw error;
  }
};

module.exports = {
  getPersonalClinicaDao,
  getPersonalClinicaByIdDao,
  createPersonalClinicaDao,
  getPersonalClinicaByEmailDao,
  getPersonalClinicaByTelefonoDao,
  getPersonalClinicaByRolIdDao,
};
