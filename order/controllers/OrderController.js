const {
  createOrderWithItems,
  updateOrderStatus,
  getOrderById,
  getOrdersByClientId,
} = require("../models/OrderModel");
const { toPositiveInt } = require("../../utils/validation");

const ALLOWED_STATUSES = new Set([
  "En attente",
  "En preparation",
  "En préparation",
  "Expediee",
  "Expédiée",
  "Livree",
  "Livrée",
  "Annulee",
  "Annulée",
]);

const normalizeStatus = (status) => {
  if (typeof status !== "string") {
    return null;
  }

  const trimmed = status.trim().toLowerCase();
  if (trimmed === "en preparation") return "En préparation";
  if (trimmed === "expediee") return "Expédiée";
  if (trimmed === "livree") return "Livrée";
  if (trimmed === "annulee") return "Annulée";
  if (trimmed === "en attente") return "En attente";
  return status.trim();
};

const buildValidatedItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const validatedItems = [];
  for (const item of items) {
    const idArticle = toPositiveInt(item && item.id_article);
    const quantite = toPositiveInt(item && item.quantite);

    if (!idArticle || !quantite) {
      return null;
    }

    validatedItems.push({
      id_article: idArticle,
      quantite,
    });
  }

  return validatedItems;
};

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const createOnlineOrder = async (req, res) => {
  try {
    const modePaiement = typeof req.body.mode_paiement === "string"
      ? req.body.mode_paiement.trim()
      : "";
    const items = buildValidatedItems(req.body.items);

    if (!modePaiement || !items) {
      return res.status(400).json({
        message: "mode_paiement et items valides sont requis",
      });
    }

    const result = await createOrderWithItems({
      clientId: req.client.id,
      modeCommande: "Web",
      statutCommande: "En attente",
      modePaiement,
      items,
      paidAt: null,
    });

    const order = await getOrderById(result.orderId);
    res.status(201).json({
      message: "Commande en ligne créée",
      commande: order,
    });
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ message: "Client invalide pour cette commande" });
    }

    if (error.message === "ARTICLE_NOT_FOUND") {
      return res.status(404).json({ message: "Un ou plusieurs articles sont introuvables" });
    }

    if (error.message === "INSUFFICIENT_STOCK") {
      return res.status(409).json({ message: "Stock insuffisant pour finaliser la commande" });
    }

    if (error.message === "ARTICLE_INACTIVE") {
      return res.status(409).json({ message: "Un ou plusieurs articles sont désactivés" });
    }

    console.error("Erreur creation commande web", error.message);
    return res.status(500).json({ message: "Erreur lors de la création de la commande" });
  }
};

const createStoreSale = async (req, res) => {
  try {
    const clientId = toPositiveInt(req.body.id_client);
    const modePaiement = typeof req.body.mode_paiement === "string"
      ? req.body.mode_paiement.trim()
      : "";
    const items = buildValidatedItems(req.body.items);

    if (!clientId || !modePaiement || !items) {
      return res.status(400).json({
        message: "id_client, mode_paiement et items valides sont requis",
      });
    }

    const result = await createOrderWithItems({
      clientId,
      modeCommande: "Magasin",
      statutCommande: "Livrée",
      modePaiement,
      items,
      paidAt: getTodayDate(),
    });

    const order = await getOrderById(result.orderId);
    res.status(201).json({
      message: "Vente magasin créée",
      commande: order,
    });
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ message: "Client invalide pour cette vente" });
    }

    if (error.message === "ARTICLE_NOT_FOUND") {
      return res.status(404).json({ message: "Un ou plusieurs articles sont introuvables" });
    }

    if (error.message === "INSUFFICIENT_STOCK") {
      return res.status(409).json({ message: "Stock insuffisant pour finaliser la vente" });
    }

    if (error.message === "ARTICLE_INACTIVE") {
      return res.status(409).json({ message: "Un ou plusieurs articles sont désactivés" });
    }

    console.error("Erreur creation vente magasin", error.message);
    return res.status(500).json({ message: "Erreur lors de la création de la vente" });
  }
};

const changeOrderStatus = async (req, res) => {
  try {
    const orderId = toPositiveInt(req.params.id);
    const normalizedStatus = normalizeStatus(req.body.statut_commande);

    if (!orderId || !normalizedStatus || !ALLOWED_STATUSES.has(normalizedStatus)) {
      return res.status(400).json({
        message: "id commande et statut_commande valide requis",
      });
    }

    const result = await updateOrderStatus(orderId, normalizedStatus);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Commande introuvable" });
    }

    const order = await getOrderById(orderId);
    return res.json({
      message: "Statut de commande mis à jour",
      commande: order,
    });
  } catch (error) {
    console.error("Erreur mise a jour statut commande", error.message);
    return res.status(500).json({ message: "Erreur lors de la mise à jour du statut" });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await getOrdersByClientId(req.client.id);
    return res.json({
      message: "Historique des commandes récupéré",
      count: orders.length,
      commandes: orders,
    });
  } catch (error) {
    console.error("Erreur recuperation commandes client", error.message);
    return res.status(500).json({ message: "Erreur lors de la récupération des commandes" });
  }
};

const getOrderForDashboard = async (req, res) => {
  try {
    const orderId = toPositiveInt(req.params.id);
    if (!orderId) {
      return res.status(400).json({ message: "Identifiant de commande invalide" });
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Commande introuvable" });
    }

    return res.json({
      message: "Commande récupérée",
      commande: order,
    });
  } catch (error) {
    console.error("Erreur recuperation commande", error.message);
    return res.status(500).json({ message: "Erreur lors de la récupération de la commande" });
  }
};

module.exports = {
  createOnlineOrder,
  createStoreSale,
  changeOrderStatus,
  getMyOrders,
  getOrderForDashboard,
};
