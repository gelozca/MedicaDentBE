const pool = require("./dbConnections");
const { v4: uuidv4 } = require("uuid");

const getHistorialMedicoByIdDao = async (id) => {
  try {
    const query = "SELECT * FROM historial_medico WHERE paciente_id = $1 ";
    const result = await pool.query(query, [id]);
    return result.rows;
  } catch (error) {
    console.error("Error al obtener el historial medico", error);
    throw error;
  }
};

const updateHistorialMedicoDaoByIdDao = async (id, data) => {
  const { paciente_id, ...rest } = data;
  const keys = Object.keys(rest);

  const setClause = keys
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", ");

  const values = Object.values(rest);

  values.push(id);

  const query = `UPDATE historial_medico SET ${setClause} WHERE paciente_id = $${values.length}`;

  try {
    await pool.query(query, values);
    const updatedHistorialMedico = await getHistorialMedicoByIdDao(id);
    return updatedHistorialMedico;
  } catch (error) {
    console.error("Error al actualizar el historial medico", error);
    throw error;
  }
};

module.exports = {
  getHistorialMedicoByIdDao,
  updateHistorialMedicoDaoByIdDao,
};
