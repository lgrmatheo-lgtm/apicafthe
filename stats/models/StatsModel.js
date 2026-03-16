const db = require("../../db");

const ORDER_ID_COL = "num\u00e9ro_commande";
const ORDER_QTY_COL = "quantit\u00e9";

let hasIsActiveCache = null;

const hasArticleIsActiveColumn = async () => {
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

const getKpiSummary = async () => {
  const [salesRows] = await db.query(
    `SELECT
       COUNT(*) AS total_commandes,
       COALESCE(SUM(montant_paiement), 0) AS chiffre_affaires_total,
       COALESCE(AVG(montant_paiement), 0) AS panier_moyen,
       COALESCE(SUM(CASE WHEN mode_commande = 'Web' THEN 1 ELSE 0 END), 0) AS commandes_web,
       COALESCE(SUM(CASE WHEN mode_commande = 'Magasin' THEN 1 ELSE 0 END), 0) AS ventes_magasin
     FROM commandes`,
  );

  const [clientRows] = await db.query("SELECT COUNT(*) AS total_clients FROM clients");
  const [stockRows] = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN stock <= 5 THEN 1 ELSE 0 END), 0) AS produits_stock_critique
     FROM articles`,
  );

  const hasIsActive = await hasArticleIsActiveColumn();
  let activeProducts = null;
  if (hasIsActive) {
    const [activeRows] = await db.query(
      "SELECT COUNT(*) AS total_produits_actifs FROM articles WHERE is_active = 1",
    );
    activeProducts = activeRows[0].total_produits_actifs;
  }

  return {
    ...salesRows[0],
    ...clientRows[0],
    ...stockRows[0],
    total_produits_actifs: activeProducts,
  };
};

const getTopProducts = async (limit = 10) => {
  const [rows] = await db.query(
    `SELECT
       c.id_article,
       a.nom_produit,
       a.categorie,
       SUM(c.\`${ORDER_QTY_COL}\`) AS quantite_vendue,
       COALESCE(SUM(c.\`${ORDER_QTY_COL}\` * a.prix_ttc), 0) AS chiffre_affaires
     FROM contenir c
     JOIN articles a ON a.id_article = c.id_article
     GROUP BY c.id_article, a.nom_produit, a.categorie
     ORDER BY quantite_vendue DESC
     LIMIT ?`,
    [limit],
  );
  return rows;
};

const getOrdersExportRows = async () => {
  const [rows] = await db.query(
    `SELECT
       c.\`${ORDER_ID_COL}\` AS numero_commande,
       c.date_commande,
       c.mode_commande,
       c.statut_commande,
       c.mode_paiement,
       c.montant_paiement,
       c.date_paiement,
       cl.id_client,
       cl.nom_client,
       cl.prenom_client,
       cl.email_client
     FROM commandes c
     JOIN clients cl ON cl.id_client = c.id_client
     ORDER BY c.date_commande DESC, c.\`${ORDER_ID_COL}\` DESC`,
  );
  return rows;
};

const getProductsExportRows = async () => {
  const hasIsActive = await hasArticleIsActiveColumn();
  const activeField = hasIsActive ? ", is_active" : "";
  const [rows] = await db.query(
    `SELECT
       id_article,
       nom_produit,
       categorie,
       prix_ht,
       taux_tva,
       prix_ttc,
       stock,
       type_vente,
       origine${activeField}
     FROM articles
     ORDER BY id_article ASC`,
  );
  return rows;
};

module.exports = {
  getKpiSummary,
  getTopProducts,
  getOrdersExportRows,
  getProductsExportRows,
};
