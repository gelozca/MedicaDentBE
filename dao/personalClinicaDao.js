const pool = require("./dbConnections");
const bcrypt = require("bcrypt");

const getPersonalClinicaDao = async () => {
  try {
    const result = await pool.query(
      "SELECT t1.email, t2.* FROM usuarios AS t1 INNER JOIN personal_clinica AS t2 ON t1.id = t2.usuario_id"
    );
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
  const client = await pool.connect();
  try {
    const {
      password_hash,
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
    } = personalClinica;

    const passwordHash = await bcrypt.hash(password_hash, 10);

    await client.query("BEGIN");

    const usuarioResult = await client.query(
      `INSERT INTO usuarios (password_hash, email, rol_id, activo)
       VALUES ($1, $2, $3, true)
       RETURNING id`,
      [passwordHash, email, rol_id]
    );
    const usuarioId = usuarioResult.rows[0].id;

    const personalResult = await client.query(
      `INSERT INTO personal_clinica (
          usuario_id, nombre, apellido_paterno, apellido_materno,
          fecha_nacimiento, num_telefono, correo, direccion, puesto,
          especialidad, numero_licencia
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
      [
        usuarioId,
        nombre,
        apellido_paterno || "",
        apellido_materno || "",
        fecha_nacimiento || null,
        num_telefono,
        correo,
        direccion || null,
        puesto || null,
        especialidad || null,
        numero_licencia || null,
      ]
    );
    const personalId = personalResult.rows[0].id;

    await client.query("COMMIT");

    return { usuario_id: usuarioId, personal_id: personalId };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al crear usuario y personal_clinica:", error);
    throw error;
  } finally {
    client.release();
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

const getPersonalClinicaByUsuarioIdDao = async (usuario_id) => {
  try {
    const result = await pool.query("SELECT * FROM personal_clinica WHERE usuario_id = $1", [usuario_id]);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  } catch (error) {
    console.error("Error al obtener el personal de la clínica por usuario_id", error);
    throw error;
  }
};

const updatePersonalClinicaByUsuarioIdDao = async (usuario_id, data) => {
  const client = await pool.connect();
  try {
    const {
      nombre,
      apellido_paterno,
      apellido_materno,
      correo,
      num_telefono,
      fecha_nacimiento,
      direccion,
      puesto,
      especialidad,
      numero_licencia,
      numero_cuenta,
      banco,
      foto_perfil_url,
    } = data;
    await client.query("BEGIN");

    const updateFields = [];
    const values = [];
    let i = 1;
    if (nombre !== undefined) {
      updateFields.push(`nombre = $${i++}`);
      values.push(nombre);
    }
    if (apellido_paterno !== undefined) {
      updateFields.push(`apellido_paterno = $${i++}`);
      values.push(apellido_paterno);
    }
    if (apellido_materno !== undefined) {
      updateFields.push(`apellido_materno = $${i++}`);
      values.push(apellido_materno);
    }
    if (correo !== undefined) {
      updateFields.push(`correo = $${i++}`);
      values.push(correo);
    }
    if (num_telefono !== undefined) {
      updateFields.push(`num_telefono = $${i++}`);
      values.push(num_telefono);
    }
    if (fecha_nacimiento !== undefined) {
      updateFields.push(`fecha_nacimiento = $${i++}`);
      values.push(fecha_nacimiento || null);
    }
    if (direccion !== undefined) {
      updateFields.push(`direccion = $${i++}`);
      values.push(direccion || null);
    }
    if (puesto !== undefined) {
      updateFields.push(`puesto = $${i++}`);
      values.push(puesto || null);
    }
    if (especialidad !== undefined) {
      updateFields.push(`especialidad = $${i++}`);
      values.push(especialidad || null);
    }
    if (numero_licencia !== undefined) {
      updateFields.push(`numero_licencia = $${i++}`);
      values.push(numero_licencia || null);
    }
    if (numero_cuenta !== undefined) {
      updateFields.push(`numero_cuenta = $${i++}`);
      values.push(numero_cuenta || null);
    }
    if (banco !== undefined) {
      updateFields.push(`banco = $${i++}`);
      values.push(banco || null);
    }
    if (data.foto_perfil_url !== undefined) {
      updateFields.push(`foto_perfil_url = $${i++}`);
      values.push(data.foto_perfil_url || null);
    }

    if (updateFields.length > 0) {
      values.push(usuario_id);
      await client.query(
        `UPDATE personal_clinica SET ${updateFields.join(", ")} WHERE usuario_id = $${i}`,
        values
      );
    }

    if (correo !== undefined) {
      await client.query(
        "UPDATE usuarios SET email = $1 WHERE id = $2",
        [correo, usuario_id]
      );
    }

    await client.query("COMMIT");
    return getPersonalClinicaByUsuarioIdDao(usuario_id);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al actualizar perfil:", error);
    throw error;
  } finally {
    client.release();
  }
};

const updateFotoPerfilPersonalClinicaByUsuarioIdDao = async (usuario_id, foto_perfil_url) => {
  try {
    await pool.query(
      "UPDATE personal_clinica SET foto_perfil_url = $1 WHERE usuario_id = $2",
      [foto_perfil_url, usuario_id]
    );
    return getPersonalClinicaByUsuarioIdDao(usuario_id);
  } catch (error) {
    console.error("Error al actualizar foto de perfil del personal", error);
    throw error;
  }
};

const deleteUsuarioByIdDao = async (usuarioId) => {
  try {
    const result = await pool.query("DELETE FROM usuarios WHERE id = $1 RETURNING id", [usuarioId]);
    return result.rowCount > 0;
  } catch (error) {
    console.error("Error al eliminar usuario", error);
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
  getPersonalClinicaByUsuarioIdDao,
  updatePersonalClinicaByUsuarioIdDao,
  updateFotoPerfilPersonalClinicaByUsuarioIdDao,
  deleteUsuarioByIdDao,
};
