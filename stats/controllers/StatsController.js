const {
  getKpiSummary,
  getTopProducts,
  getOrdersExportRows,
  getProductsExportRows,
} = require("../models/StatsModel");
const { toPositiveInt } = require("../../utils/validation");

const escapeCsv = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue = String(value);
  if (/[",;\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }
  return stringValue;
};

const toDelimited = (rows, headers, delimiter) => {
  const lines = [
    headers.join(delimiter),
    ...rows.map((row) => headers.map((key) => escapeCsv(row[key])).join(delimiter)),
  ];
  return `${lines.join("\n")}\n`;
};

const sendExport = (res, filename, contentType, content) => {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
  res.send(content);
};

const getKpis = async (req, res) => {
  try {
    const summary = await getKpiSummary();
    return res.json({
      message: "KPI récupérés",
      kpi: summary,
    });
  } catch (error) {
    console.error("Erreur stats KPI", error.message);
    return res.status(500).json({ message: "Erreur lors de la récupération des KPI" });
  }
};

const getTopProductsStats = async (req, res) => {
  try {
    const limit = toPositiveInt(req.query.limit) || 10;
    const topProducts = await getTopProducts(limit);
    return res.json({
      message: "Top produits récupéré",
      count: topProducts.length,
      produits: topProducts,
    });
  } catch (error) {
    console.error("Erreur stats top produits", error.message);
    return res.status(500).json({
      message: "Erreur lors de la récupération du top produits",
    });
  }
};

const exportOrdersCsv = async (req, res) => {
  try {
    const rows = await getOrdersExportRows();
    const headers = [
      "numero_commande",
      "date_commande",
      "mode_commande",
      "statut_commande",
      "mode_paiement",
      "montant_paiement",
      "date_paiement",
      "id_client",
      "nom_client",
      "prenom_client",
      "email_client",
    ];
    const csv = toDelimited(rows, headers, ";");
    return sendExport(res, "commandes.csv", "text/csv; charset=utf-8", csv);
  } catch (error) {
    console.error("Erreur export CSV commandes", error.message);
    return res.status(500).json({ message: "Erreur lors de l'export commandes CSV" });
  }
};

const exportProductsCsv = async (req, res) => {
  try {
    const rows = await getProductsExportRows();
    const baseHeaders = [
      "id_article",
      "nom_produit",
      "categorie",
      "prix_ht",
      "taux_tva",
      "prix_ttc",
      "stock",
      "type_vente",
      "origine",
    ];
    const headers = rows[0] && Object.prototype.hasOwnProperty.call(rows[0], "is_active")
      ? [...baseHeaders, "is_active"]
      : baseHeaders;
    const csv = toDelimited(rows, headers, ";");
    return sendExport(res, "produits.csv", "text/csv; charset=utf-8", csv);
  } catch (error) {
    console.error("Erreur export CSV produits", error.message);
    return res.status(500).json({ message: "Erreur lors de l'export produits CSV" });
  }
};

const exportOrdersExcel = async (req, res) => {
  try {
    const rows = await getOrdersExportRows();
    const headers = [
      "numero_commande",
      "date_commande",
      "mode_commande",
      "statut_commande",
      "mode_paiement",
      "montant_paiement",
      "date_paiement",
      "id_client",
      "nom_client",
      "prenom_client",
      "email_client",
    ];
    const table = toDelimited(rows, headers, "\t");
    return sendExport(
      res,
      "commandes.xls",
      "application/vnd.ms-excel; charset=utf-8",
      table,
    );
  } catch (error) {
    console.error("Erreur export Excel commandes", error.message);
    return res.status(500).json({ message: "Erreur lors de l'export commandes Excel" });
  }
};

module.exports = {
  getKpis,
  getTopProductsStats,
  exportOrdersCsv,
  exportProductsCsv,
  exportOrdersExcel,
};
