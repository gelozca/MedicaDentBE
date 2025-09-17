const pool = require("./dbConnections");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const createOdontogramaDao = async (paciente_id, fecha_odontograma, tipo) => {
  try {
    const id = uuidv4();
    const query = `
      INSERT INTO odontograma (id, paciente_id, fecha_odontograma, tipo)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const result = await pool.query(query, [
      id,
      paciente_id,
      fecha_odontograma,
      tipo,
    ]);
    return result.rows[0];
  } catch (error) {
    console.error("Error al crear el odontograma", error);
    throw error;
  }
};

const getOdontogramaByPacienteIdDao = async (paciente_id) => {
  const query = "SELECT * FROM odontograma WHERE paciente_id = $1";
  const result = await pool.query(query, [paciente_id]);
  return result.rows;
};

const findOdontogramaByIdDao = async (id) => {
  try {
    const query = "SELECT * FROM odontograma WHERE id = $1";
    const result = await pool.query(query, [id]);
    return result.rows[0];
  } catch (error) {
    console.error("Error al obtener el odontograma por ID", error);
    throw error;
  }
};

const createOdontogramaDienteDao = async (dienteData) => {
  try {
    const {
      odontograma_id,
      num_diente,
      diagnostico,
      tratamiento,
      notas,
      st0,
      st1,
      st2,
      st3,
      st4,
    } = dienteData;

    const query = `
      INSERT INTO odontograma_diente (odontograma_id, num_diente, diagnostico, tratamiento, notas, st0, st1, st2, st3, st4)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const result = await pool.query(query, [
      odontograma_id,
      num_diente,
      diagnostico,
      tratamiento,
      notas,
      st0,
      st1,
      st2,
      st3,
      st4,
    ]);
    return result.rows[0];
  } catch (error) {
    console.error("Error al crear el diente del odontograma", error);
    throw error;
  }
};

const getOdontogramaDienteByOdontogramaIdDao = async (odontograma_id) => {
  try {
    const query = "SELECT * FROM odontograma_diente WHERE odontograma_id = $1";
    const result = await pool.query(query, [odontograma_id]);
    return result.rows;
  } catch (error) {
    console.error("Error al obtener los dientes del odontograma", error);
    throw error;
  }
};

const getOdontogramaDienteByIdDao = async (id) => {
  try {
    const query = "SELECT * FROM odontograma_diente WHERE id = $1";
    const result = await pool.query(query, [id]);
    return result.rows[0];
  } catch (error) {
    console.error("Error al obtener el diente del odontograma", error);
    throw error;
  }
};

const updateOdontogramaDienteByIdDao = async (id, data) => {
  try {
    const {
      num_diente,
      diagnostico,
      tratamiento,
      notas,
      st0,
      st1,
      st2,
      st3,
      st4,
    } = data;
    const query =
      "UPDATE odontograma_diente SET num_diente = $1, diagnostico = $2, tratamiento = $3, notas = $4, st0 = $5, st1 = $6, st2 = $7, st3 = $8, st4 = $9 WHERE id = $10 RETURNING *";
    const result = await pool.query(query, [
      num_diente,
      diagnostico,
      tratamiento,
      notas,
      st0,
      st1,
      st2,
      st3,
      st4,
      id,
    ]);
    return result.rows[0];
  } catch (error) {
    console.error("Error al actualizar el diente del odontograma", error);
    throw error;
  }
};

const deleteOdontogramaDienteByIdDao = async (id) => {
  try {
    const query = "DELETE FROM odontograma_diente WHERE id = $1 RETURNING *";
    const result = await pool.query(query, [id]);
    return result.rows[0];
  } catch (error) {
    console.error("Error al eliminar el diente del odontograma", error);
    throw error;
  }
};

const deleteOdontogramaByPacienteIdDao = async (paciente_id) => {
  try {
    const query = "DELETE FROM odontograma WHERE paciente_id = $1 RETURNING *";
    const result = await pool.query(query, [paciente_id]);
    return result.rows;
  } catch (error) {
    console.error("Error al eliminar el odontograma", error);
    throw error;
  }
};

const getDienteByIdDao = async (id) => {
  try {
    const query = "SELECT * FROM odontograma_diente WHERE id = $1";
    const result = await pool.query(query, [id]);
    return result.rows[0];
  } catch (error) {
    console.error("Error al obtener el diente", error);
    throw error;
  }
};

module.exports = {
  createOdontogramaDao,
  getOdontogramaByPacienteIdDao,
  findOdontogramaByIdDao,
  createOdontogramaDienteDao,
  getOdontogramaDienteByOdontogramaIdDao,
  getOdontogramaDienteByIdDao,
  updateOdontogramaDienteByIdDao,
  deleteOdontogramaDienteByIdDao,
  deleteOdontogramaByPacienteIdDao,
  getDienteByIdDao,
};
