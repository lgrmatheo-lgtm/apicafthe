const db = require("../../db");

const EMPLOYE_TABLE = "employ\u00e9s";
const COL_ID = "numero_employ\u00e9";
const COL_NOM = "nom_employ\u00e9";
const COL_PRENOM = "pr\u00e9nom_employ\u00e9";
const COL_EMAIL = "email_employ\u00e9";
const COL_PHONE = "t\u00e9l\u00e9phone_employ\u00e9";
const COL_PASSWORD = "mdp_employ\u00e9";
const COL_ROLE = "role";

const findEmployeByEmail = async (email) => {
  const [rows] = await db.query(
    `SELECT
       \`${COL_ID}\` AS id_employe,
       \`${COL_NOM}\` AS nom,
       \`${COL_PRENOM}\` AS prenom,
       \`${COL_EMAIL}\` AS email,
       \`${COL_PHONE}\` AS telephone,
       \`${COL_ROLE}\` AS role,
       \`${COL_PASSWORD}\` AS mot_de_passe
     FROM \`${EMPLOYE_TABLE}\`
     WHERE \`${COL_EMAIL}\` = ?
     LIMIT 1`,
    [email],
  );
  return rows[0] || null;
};

const findEmployeById = async (id) => {
  const [rows] = await db.query(
    `SELECT
       \`${COL_ID}\` AS id_employe,
       \`${COL_NOM}\` AS nom,
       \`${COL_PRENOM}\` AS prenom,
       \`${COL_EMAIL}\` AS email,
       \`${COL_PHONE}\` AS telephone,
       \`${COL_ROLE}\` AS role
     FROM \`${EMPLOYE_TABLE}\`
     WHERE \`${COL_ID}\` = ?
     LIMIT 1`,
    [id],
  );
  return rows[0] || null;
};

const updateEmployePassword = async (id, hashedPassword) => {
  const [result] = await db.query(
    `UPDATE \`${EMPLOYE_TABLE}\`
     SET \`${COL_PASSWORD}\` = ?
     WHERE \`${COL_ID}\` = ?`,
    [hashedPassword, id],
  );
  return result;
};

module.exports = {
  findEmployeByEmail,
  findEmployeById,
  updateEmployePassword,
};
