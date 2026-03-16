// Controleur pour les articles
const {
  getAllArticles,
  getArticleById,
  getArticlesByCategory,
  createArticle,
  updateArticleById,
  softDeleteArticleById,
} = require("../models/ArticleModels");
const {
  isNonEmptyString,
  sanitizeText,
  toPositiveInt,
  toNonNegativeNumber,
} = require("../../utils/validation");

const normalizeArticlePayload = (body) => {
  const prixHt = toNonNegativeNumber(body.prix_ht);
  const tauxTva = toNonNegativeNumber(body.taux_tva);
  const stock = toPositiveInt(body.stock);

  if (
    !isNonEmptyString(body.nom_produit) ||
    !isNonEmptyString(body.categorie) ||
    !isNonEmptyString(body.type_vente) ||
    prixHt === null ||
    tauxTva === null ||
    stock === null
  ) {
    return null;
  }

  const prixTtc = Number((prixHt * (1 + tauxTva / 100)).toFixed(2));

  return {
    nom_produit: sanitizeText(body.nom_produit),
    description: sanitizeText(body.description || ""),
    categorie: sanitizeText(body.categorie),
    prix_ht: prixHt,
    type_vente: sanitizeText(body.type_vente),
    taux_tva: tauxTva,
    prix_ttc: prixTtc,
    images: sanitizeText(body.images || ""),
    stock,
    origine: sanitizeText(body.origine || ""),
  };
};

// Recupere tous les articles
const getAll = async (req, res) => {
  try {
    const includeInactive = req.query.include_inactive === "true";
    const articles = await getAllArticles(includeInactive);
    res.json({
      message: "Articles recuperes",
      count: articles.length,
      articles,
    });
  } catch (err) {
    console.error("Erreur lors de la recuperation des articles", err.message);
    res.status(500).json({
      message: "Erreur lors de la recuperation des articles",
    });
  }
};

// Recupere un article par son id
const getById = async (req, res) => {
  try {
    const articleId = toPositiveInt(req.params.id);
    if (!articleId) {
      return res.status(400).json({ message: "Identifiant article invalide" });
    }

    const includeInactive = req.query.include_inactive === "true";
    const article = await getArticleById(articleId, includeInactive);
    if (!article) {
      return res.status(404).json({
        message: "Article non trouve",
      });
    }

    return res.json({
      message: "Article recupere",
      article,
    });
  } catch (err) {
    console.error("Erreur lors de la recuperation de l'article", err.message);
    return res.status(500).json({
      message: "Erreur lors de la recuperation de l'article",
    });
  }
};

// Recupere les produits par categorie
const getByCategory = async (req, res) => {
  try {
    const categorie = sanitizeText(req.params.categorie || "");
    if (!categorie) {
      return res.status(400).json({ message: "Categorie invalide" });
    }

    const includeInactive = req.query.include_inactive === "true";
    const articles = await getArticlesByCategory(categorie, includeInactive);
    return res.json({
      message: `Articles de la categorie ${categorie}`,
      count: articles.length,
      articles,
    });
  } catch (err) {
    console.error("Erreur lors de la recuperation par categorie", err.message);
    return res.status(500).json({
      message: "Erreur de recuperation des articles",
    });
  }
};

const create = async (req, res) => {
  try {
    const payload = normalizeArticlePayload(req.body);
    if (!payload) {
      return res.status(400).json({
        message:
          "nom_produit, categorie, type_vente, prix_ht, taux_tva et stock valides sont requis",
      });
    }

    const result = await createArticle(payload);
    const article = await getArticleById(result.idArticle, true);
    return res.status(201).json({
      message: "Article cree",
      article,
    });
  } catch (err) {
    console.error("Erreur creation article", err.message);
    return res.status(500).json({
      message: "Erreur lors de la creation de l'article",
    });
  }
};

const update = async (req, res) => {
  try {
    const articleId = toPositiveInt(req.params.id);
    if (!articleId) {
      return res.status(400).json({ message: "Identifiant article invalide" });
    }

    const payload = normalizeArticlePayload(req.body);
    if (!payload) {
      return res.status(400).json({
        message:
          "nom_produit, categorie, type_vente, prix_ht, taux_tva et stock valides sont requis",
      });
    }

    const result = await updateArticleById(articleId, payload);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Article non trouve" });
    }

    const article = await getArticleById(articleId, true);
    return res.json({
      message: "Article mis a jour",
      article,
    });
  } catch (err) {
    console.error("Erreur mise a jour article", err.message);
    return res.status(500).json({
      message: "Erreur lors de la mise a jour de l'article",
    });
  }
};

const remove = async (req, res) => {
  try {
    const articleId = toPositiveInt(req.params.id);
    if (!articleId) {
      return res.status(400).json({ message: "Identifiant article invalide" });
    }

    const result = await softDeleteArticleById(articleId);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Article non trouve" });
    }

    return res.json({
      message: "Article desactive",
    });
  } catch (err) {
    if (err.message === "SOFT_DELETE_COLUMN_MISSING") {
      return res.status(500).json({
        message: "Colonne is_active absente: applique la migration SQL",
      });
    }

    console.error("Erreur suppression article", err.message);
    return res.status(500).json({
      message: "Erreur lors de la suppression de l'article",
    });
  }
};

module.exports = {
  getAll,
  getById,
  getByCategory,
  create,
  update,
  remove,
};
