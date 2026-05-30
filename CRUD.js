require("dotenv").config();
("use strict");

const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

// Credenciales en fichero .env
const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT) || 10000,
};

// Helper: obtener conexion
async function getConnection() {
  return await mysql.createConnection(DB_CONFIG);
}

// ─────────────────────────────────────────
// CREATE USER
// ─────────────────────────────────────────
module.exports.create = async (event) => {
  let conn;
  try {
    const body = JSON.parse(event.body);

    // Campos obligatorios (sin password, se genera automáticamente)
    if (
      !body.firstName ||
      !body.lastName ||
      !body.email ||
      !body.locale ||
      !body.idEnterprise ||
      !body.birthday
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message:
            "Faltan campos obligatorios: firstName, lastName, email, locale, idEnterprise, birthday",
        }),
      };
    }

    // Generar password automática igual que el CRUD PHP: bcrypt de 'cambiame'
    const hashedPassword = await bcrypt.hash("cambiame", 10);

    conn = await getConnection();

    const sql = `
      INSERT INTO User (firstName, lastName, email, phoneNumber, password, active, locale, idEnterprise, birthday)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await conn.execute(sql, [
      body.firstName,
      body.lastName,
      body.email,
      body.phoneNumber || null,
      hashedPassword,
      body.active !== undefined ? body.active : 1,
      body.locale,
      body.idEnterprise,
      body.birthday,
    ]);

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Usuario creado correctamente",
        id: result.insertId,
      }),
    };
  } catch (error) {
    // Email duplicado
    if (error.code === "ER_DUP_ENTRY") {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: "El email ya existe" }),
      };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal server error",
        error: error.message,
      }),
    };
  } finally {
    if (conn) await conn.end();
  }
};

// ─────────────────────────────────────────
// SEE USER BY ID
// ─────────────────────────────────────────
module.exports.see = async (event) => {
  let conn;
  try {
    const body = JSON.parse(event.body);
    const id = body.id;

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "El campo 'id' es obligatorio" }),
      };
    }

    conn = await getConnection();

    const [rows] = await conn.execute("SELECT * FROM User WHERE id = ?", [id]);

    if (rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Usuario no encontrado" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(rows[0]),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal server error",
        error: error.message,
      }),
    };
  } finally {
    if (conn) await conn.end();
  }
};

// ─────────────────────────────────────────
// EDIT USER
// ─────────────────────────────────────────
module.exports.edit = async (event) => {
  let conn;
  try {
    const body = JSON.parse(event.body);
    const id = body.id;

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "El campo 'id' es obligatorio" }),
      };
    }

    conn = await getConnection();

    // Verificar que existe
    const [existing] = await conn.execute("SELECT * FROM User WHERE id = ?", [
      id,
    ]);

    if (existing.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Usuario no encontrado" }),
      };
    }

    const current = existing[0];

    const sql = `
      UPDATE User
      SET firstName    = ?,
          lastName     = ?,
          email        = ?,
          phoneNumber  = ?,
          password     = ?,
          active       = ?,
          locale       = ?,
          idEnterprise = ?,
          birthday     = ?
      WHERE id = ?
    `;

    await conn.execute(sql, [
      body.firstName !== undefined ? body.firstName : current.firstName,
      body.lastName !== undefined ? body.lastName : current.lastName,
      body.email !== undefined ? body.email : current.email,
      body.phoneNumber !== undefined ? body.phoneNumber : current.phoneNumber,
      body.password !== undefined ? body.password : current.password,
      body.active !== undefined ? body.active : current.active,
      body.locale !== undefined ? body.locale : current.locale,
      body.idEnterprise !== undefined
        ? body.idEnterprise
        : current.idEnterprise,
      body.birthday !== undefined ? body.birthday : current.birthday,
      id,
    ]);

    // Devolver el usuario actualizado
    const [updated] = await conn.execute("SELECT * FROM User WHERE id = ?", [
      id,
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Usuario actualizado correctamente",
        user: updated[0],
      }),
    };
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return {
        statusCode: 409,
        body: JSON.stringify({ message: "El email ya existe" }),
      };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal server error",
        error: error.message,
      }),
    };
  } finally {
    if (conn) await conn.end();
  }
};

// ─────────────────────────────────────────
// DELETE USER
// ─────────────────────────────────────────
module.exports.delete = async (event) => {
  let conn;
  try {
    const body = JSON.parse(event.body);
    const id = body.id;

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "El campo 'id' es obligatorio" }),
      };
    }

    conn = await getConnection();

    // Verificar que existe
    const [existing] = await conn.execute("SELECT id FROM User WHERE id = ?", [
      id,
    ]);

    if (existing.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Usuario no encontrado" }),
      };
    }

    await conn.execute("DELETE FROM User WHERE id = ?", [id]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Usuario eliminado correctamente",
        id,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal server error",
        error: error.message,
      }),
    };
  } finally {
    if (conn) await conn.end();
  }
};
