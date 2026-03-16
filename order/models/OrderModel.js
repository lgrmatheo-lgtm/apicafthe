const db = require("../../db");

const ORDER_ID_COL = "num\u00e9ro_commande";
const ORDER_QTY_COL = "quantit\u00e9";

let articleHasIsActiveCache = null;

const hasArticleIsActiveColumn = async (connection = db) => {
  if (articleHasIsActiveCache !== null) {
    return articleHasIsActiveCache;
  }

  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'articles'
       AND COLUMN_NAME = 'is_active'`,
  );

  articleHasIsActiveCache = rows[0].count > 0;
  return articleHasIsActiveCache;
};

const getArticlesForUpdate = async (connection, articleIds) => {
  const uniqueIds = [...new Set(articleIds)];
  if (uniqueIds.length === 0) {
    return [];
  }

  const placeholders = uniqueIds.map(() => "?").join(", ");
  const includeActive = await hasArticleIsActiveColumn(connection);
  const activeField = includeActive ? ", is_active" : "";
  const [rows] = await connection.query(
    `SELECT id_article, nom_produit, prix_ttc, stock${activeField}
     FROM articles
     WHERE id_article IN (${placeholders})
     FOR UPDATE`,
    uniqueIds,
  );

  return rows;
};

const createOrderWithItems = async ({
  clientId,
  modeCommande,
  statutCommande,
  modePaiement,
  items,
  paidAt = null,
}) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const normalizedItems = items.reduce((acc, item) => {
      const existing = acc.find((entry) => entry.id_article === item.id_article);
      if (existing) {
        existing.quantite += item.quantite;
      } else {
        acc.push({
          id_article: item.id_article,
          quantite: item.quantite,
        });
      }
      return acc;
    }, []);

    const articleIds = normalizedItems.map((item) => item.id_article);
    const articles = await getArticlesForUpdate(connection, articleIds);

    if (articles.length !== articleIds.length) {
      throw new Error("ARTICLE_NOT_FOUND");
    }

    const articleMap = new Map(articles.map((article) => [article.id_article, article]));
    let totalAmount = 0;

    for (const item of normalizedItems) {
      const article = articleMap.get(item.id_article);
      if (!article) {
        throw new Error("ARTICLE_NOT_FOUND");
      }

      if (article.is_active !== undefined && Number(article.is_active) !== 1) {
        throw new Error("ARTICLE_INACTIVE");
      }

      if (!Number.isFinite(Number(article.stock)) || Number(article.stock) < item.quantite) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      totalAmount += Number(article.prix_ttc || 0) * item.quantite;
    }

    const [orderResult] = await connection.query(
      `INSERT INTO commandes
        (date_commande, mode_commande, statut_commande, mode_paiement, montant_paiement, date_paiement, id_client)
       VALUES (CURDATE(), ?, ?, ?, ?, ?, ?)`,
      [
        modeCommande,
        statutCommande,
        modePaiement,
        Number(totalAmount.toFixed(2)),
        paidAt,
        clientId,
      ],
    );

    const orderId = orderResult.insertId;

    for (const item of normalizedItems) {
      await connection.query(
        `INSERT INTO contenir
          (id_article, \`${ORDER_ID_COL}\`, \`${ORDER_QTY_COL}\`)
         VALUES (?, ?, ?)`,
        [item.id_article, orderId, item.quantite],
      );

      const [stockResult] = await connection.query(
        `UPDATE articles
         SET stock = stock - ?
         WHERE id_article = ?
           AND stock >= ?`,
        [item.quantite, item.id_article, item.quantite],
      );

      if (stockResult.affectedRows !== 1) {
        throw new Error("INSUFFICIENT_STOCK");
      }
    }

    await connection.commit();
    return {
      orderId,
      totalAmount: Number(totalAmount.toFixed(2)),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const updateOrderStatus = async (orderId, status) => {
  const [result] = await db.query(
    `UPDATE commandes
     SET statut_commande = ?
     WHERE \`${ORDER_ID_COL}\` = ?`,
    [status, orderId],
  );
  return result;
};

const getOrderLinesByOrderId = async (orderId) => {
  const [rows] = await db.query(
    `SELECT
       c.id_article,
       a.nom_produit,
       c.\`${ORDER_QTY_COL}\` AS quantite,
       a.prix_ttc
     FROM contenir c
     JOIN articles a ON a.id_article = c.id_article
     WHERE c.\`${ORDER_ID_COL}\` = ?`,
    [orderId],
  );
  return rows;
};

const getOrderById = async (orderId) => {
  const [rows] = await db.query(
    `SELECT
       \`${ORDER_ID_COL}\` AS numero_commande,
       date_commande,
       mode_commande,
       statut_commande,
       mode_paiement,
       montant_paiement,
       date_paiement,
       id_client
     FROM commandes
     WHERE \`${ORDER_ID_COL}\` = ?`,
    [orderId],
  );

  if (!rows[0]) {
    return null;
  }

  const lines = await getOrderLinesByOrderId(orderId);
  return {
    ...rows[0],
    lignes: lines,
  };
};

const getOrdersByClientId = async (clientId) => {
  const [orders] = await db.query(
    `SELECT
       \`${ORDER_ID_COL}\` AS numero_commande,
       date_commande,
       mode_commande,
       statut_commande,
       mode_paiement,
       montant_paiement,
       date_paiement,
       id_client
     FROM commandes
     WHERE id_client = ?
     ORDER BY date_commande DESC, \`${ORDER_ID_COL}\` DESC`,
    [clientId],
  );

  if (orders.length === 0) {
    return [];
  }

  const orderIds = orders.map((order) => order.numero_commande);
  const placeholders = orderIds.map(() => "?").join(", ");
  const [lines] = await db.query(
    `SELECT
       c.\`${ORDER_ID_COL}\` AS numero_commande,
       c.id_article,
       a.nom_produit,
       c.\`${ORDER_QTY_COL}\` AS quantite,
       a.prix_ttc
     FROM contenir c
     JOIN articles a ON a.id_article = c.id_article
     WHERE c.\`${ORDER_ID_COL}\` IN (${placeholders})
     ORDER BY c.\`${ORDER_ID_COL}\` DESC`,
    orderIds,
  );

  const linesByOrderId = lines.reduce((acc, line) => {
    if (!acc[line.numero_commande]) {
      acc[line.numero_commande] = [];
    }
    acc[line.numero_commande].push({
      id_article: line.id_article,
      nom_produit: line.nom_produit,
      quantite: line.quantite,
      prix_ttc: line.prix_ttc,
    });
    return acc;
  }, {});

  return orders.map((order) => ({
    ...order,
    lignes: linesByOrderId[order.numero_commande] || [],
  }));
};

module.exports = {
  createOrderWithItems,
  updateOrderStatus,
  getOrderById,
  getOrdersByClientId,
};
