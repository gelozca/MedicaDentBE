const pool = require("./dbConnections");
const { v4: uuidv4 } = require("uuid");

const getAllPacientesDao = async () => {
  try {
    const query = "SELECT * FROM pacientes";
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error("Error al obtener los pacientes", error);
    throw error;
  }
};

const getPacienteByIdDao = async (id) => {
  try {
    const query = "SELECT * FROM pacientes WHERE id = $1";
    const result = await pool.query(query, [id]);
    return result.rows[0];
  } catch (error) {
    console.error("Error al obtener el paciente", error);
    throw error;
  }
};

const createPacienteDao = async (paciente) => {
  try {
    const {
      nombre,
      apellido_paterno,
      apellido_materno,
      sexo,
      fecha_nacimiento,
      correo,
      num_telefono,
      direccion,
      ocupacion,
    } = paciente;
    const query =
      "INSERT INTO pacientes (nombre, apellido_paterno, apellido_materno, sexo, fecha_nacimiento, correo, num_telefono, direccion, ocupacion) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *";
    const result = await pool.query(query, [
      nombre,
      apellido_paterno,
      apellido_materno,
      sexo,
      fecha_nacimiento,
      correo,
      num_telefono,
      direccion,
      ocupacion,
    ]);
    const query2 = "INSERT INTO historial_medico (paciente_id) VALUES ($1)";
    await pool.query(query2, [result.rows[0].id]);
    return result.rows[0];
  } catch (error) {
    console.error("Error al crear el paciente", error);
    throw error;
  }
};

const updatePacienteByIdDao = async (id, paciente) => {
  try {
    const {
      nombre,
      apellido_paterno,
      apellido_materno,
      num_telefono,
      correo,
      direccion,
      color,
      clasificacion,
      foto_perfil_url,
      sexo,
      fecha_nacimiento,
      ocupacion,
    } = paciente;
    const query =
      "UPDATE pacientes SET nombre = $1, apellido_paterno = $2, apellido_materno = $3, num_telefono = $4, correo = $5, direccion = $6, color = $7, clasificacion = $8, foto_perfil_url = $9, sexo = $10, fecha_nacimiento = $11, ocupacion = $12 WHERE id = $13 RETURNING *";
    const result = await pool.query(query, [
      nombre,
      apellido_paterno,
      apellido_materno,
      num_telefono,
      correo,
      direccion,
      color,
      clasificacion,
      foto_perfil_url,
      sexo,
      fecha_nacimiento,
      ocupacion,
      id,
    ]);
    return result.rows[0];
  } catch (error) {
    console.error("Error al actualizar el paciente", error);
    throw error;
  }
};

const deletePacienteByIdDao = async (id) => {
  try {
    const query = "DELETE FROM pacientes WHERE id = $1 RETURNING *";
    const result = await pool.query(query, [id]);
    return result.rows[0];
  } catch (error) {
    console.error("Error al eliminar el paciente", error);
    throw error;
  }
};

const getPacienteByEmailDao = async (email) => {
  try {
    const query = "SELECT * FROM pacientes WHERE correo = $1";
    const result = await pool.query(query, [email]);
    return result.rows[0];
  } catch (error) {
    console.error("Error al obtener el paciente por email", error);
    throw error;
  }
};

const getPacienteByTelefonoDao = async (telefono) => {
  try {
    const query = "SELECT * FROM pacientes WHERE num_telefono = $1";
    const result = await pool.query(query, [telefono]);
    return result.rows[0];
  } catch (error) {
    console.error("Error al obtener el paciente por telefono", error);
    throw error;
  }
};

const updateFotoPerfilPacienteByIdDao = async (id, fotoPerfil) => {
  try {
    const query =
      "UPDATE pacientes SET foto_perfil_url = $1 WHERE id = $2 RETURNING *";
    const result = await pool.query(query, [fotoPerfil, id]);
    return result.rows[0];
  } catch (error) {
    console.error("Error al actualizar la foto de perfil del paciente", error);
    throw error;
  }
};

module.exports = {
  getAllPacientesDao,
  getPacienteByIdDao,
  createPacienteDao,
  updatePacienteByIdDao,
  deletePacienteByIdDao,
  getPacienteByEmailDao,
  getPacienteByTelefonoDao,
  updateFotoPerfilPacienteByIdDao,
};
