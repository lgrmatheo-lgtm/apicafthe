// Modele pour les articles
const db = require("../../db");

let hasIsActiveCache = null;

const hasIsActiveColumn = async () => {
  if (hasIsActiveCache !== null) {
    return hasIsActiveCache;
  }

  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'articles'
       AND COLUMN_NAME = 'is_active'`,
  );

  hasIsActiveCache = rows[0].count > 0;
  return hasIsActiveCache;
};

const getAllArticles = async (includeInactive = false) => {
  const canFilter = await hasIsActiveColumn();
  let query = "SELECT * FROM articles";
  if (canFilter && !includeInactive) {
    query += " WHERE is_active = 1";
  }
  query += " ORDER BY id_article ASC";

  const [rows] = await db.query(query);
  return rows;
};

const getArticleById = async (id, includeInactive = false) => {
  const canFilter = await hasIsActiveColumn();
  let query = "SELECT * FROM articles WHERE id_article = ?";
  const params = [id];

  if (canFilter && !includeInactive) {
    query += " AND is_active = 1";
  }

  const [rows] = await db.query(query, params);
  return rows[0] || null;
};

const getArticlesByCategory = async (categorie, includeInactive = false) => {
  const canFilter = await hasIsActiveColumn();
  let query = "SELECT * FROM articles WHERE categorie = ?";
  const params = [categorie];

  if (canFilter && !includeInactive) {
    query += " AND is_active = 1";
  }

  query += " ORDER BY id_article ASC";
  const [rows] = await db.query(query, params);
  return rows;
};

const getNextArticleId = async () => {
  const [rows] = await db.query(
    "SELECT COALESCE(MAX(id_article), 0) + 1 AS next_id FROM articles",
  );
  return rows[0].next_id;
};

const createArticle = async (articleData) => {
  const idArticle = await getNextArticleId();
  const hasIsActive = await hasIsActiveColumn();

  const fields = [
    "id_article",
    "nom_produit",
    "description",
    "categorie",
    "prix_ht",
    "type_vente",
    "taux_tva",
    "prix_ttc",
    "images",
    "stock",
    "origine",
  ];
  const values = [
    idArticle,
    articleData.nom_produit,
    articleData.description || null,
    articleData.categorie,
    articleData.prix_ht,
    articleData.type_vente,
    articleData.taux_tva,
    articleData.prix_ttc,
    articleData.images || null,
    articleData.stock,
    articleData.origine || null,
  ];

  if (hasIsActive) {
    fields.push("is_active");
    values.push(1);
  }

  const placeholders = fields.map(() => "?").join(", ");
  const [result] = await db.query(
    `INSERT INTO articles (${fields.join(", ")}) VALUES (${placeholders})`,
    values,
  );

  return {
    ...result,
    idArticle,
  };
};

const updateArticleById = async (id, articleData) => {
  const [result] = await db.query(
    `UPDATE articles
     SET nom_produit = ?,
         description = ?,
         categorie = ?,
         prix_ht = ?,
         type_vente = ?,
         taux_tva = ?,
         prix_ttc = ?,
         images = ?,
         stock = ?,
         origine = ?
     WHERE id_article = ?`,
    [
      articleData.nom_produit,
      articleData.description || null,
      articleData.categorie,
      articleData.prix_ht,
      articleData.type_vente,
      articleData.taux_tva,
      articleData.prix_ttc,
      articleData.images || null,
      articleData.stock,
      articleData.origine || null,
      id,
    ],
  );
  return result;
};

const softDeleteArticleById = async (id) => {
  const hasIsActive = await hasIsActiveColumn();
  if (!hasIsActive) {
    throw new Error("SOFT_DELETE_COLUMN_MISSING");
  }

  const [result] = await db.query(
    "UPDATE articles SET is_active = 0 WHERE id_article = ?",
    [id],
  );
  return result;
};

module.exports = {
  getAllArticles,
  getArticleById,
  getArticlesByCategory,
  createArticle,
  updateArticleById,
  softDeleteArticleById,
};
