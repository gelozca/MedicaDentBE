const pool = require("./dbConnections");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const createAutoRegisterDao = async () => {
  const id = uuidv4();

  const registration_link = `/medicadent/${id}/registro-paciente`;

  const query = `
    INSERT INTO autoregister (id, registration_link, activo)
    VALUES ($1, $2, true)
    RETURNING *;
  `;

  const result = await pool.query(query, [id, registration_link]);

  return result.rows[0];
};

const getAutoRegisterDao = async () => {
  const query = "SELECT * FROM autoregister";
  const result = await pool.query(query);
  return result.rows;
};

const updateAutoRegisterByIdDao = async (id, data) => {
  try {
    const { activo } = data;

    const autoRegister = await findAutoRegisterByIdDao(id);    
    if (!autoRegister) {
      return null;
    }

    const query = "UPDATE autoregister SET activo = $1 WHERE id = $2";
    const result = await pool.query(query, [activo, id]);
    if (result.rowCount === 0) {
      return null;
    }
    const updatedAutoRegister = await findAutoRegisterByIdDao(id);
    return updatedAutoRegister;
  } catch (error) {
    console.error("Error al actualizar el link de registro", error);
    throw error;
  }
};

const findAutoRegisterByIdDao = async (id) => {
  const query = "SELECT * FROM autoregister WHERE id = $1";
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

module.exports = {
  createAutoRegisterDao,
  getAutoRegisterDao,
  updateAutoRegisterByIdDao,
};
