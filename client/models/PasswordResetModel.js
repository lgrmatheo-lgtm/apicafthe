const db = require("../../db");

const createPasswordResetToken = async (clientId, tokenHash, expiresAt) => {
  const [result] = await db.query(
    `INSERT INTO password_reset_tokens
      (id_client, token_hash, expires_at)
     VALUES (?, ?, ?)`,
    [clientId, tokenHash, expiresAt],
  );
  return result;
};

const findValidPasswordResetToken = async (tokenHash) => {
  const [rows] = await db.query(
    `SELECT id, id_client, expires_at, used_at
     FROM password_reset_tokens
     WHERE token_hash = ?
       AND used_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash],
  );
  return rows[0];
};

const markPasswordResetTokenUsed = async (id) => {
  const [result] = await db.query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE id = ?`,
    [id],
  );
  return result;
};

const purgeExpiredPasswordResetTokens = async () => {
  await db.query(
    `DELETE FROM password_reset_tokens
     WHERE expires_at <= NOW() OR used_at IS NOT NULL`,
  );
};

module.exports = {
  createPasswordResetToken,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
  purgeExpiredPasswordResetTokens,
};
