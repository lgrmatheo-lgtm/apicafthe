const express = require("express");
const router = express.Router();
const {
  getKpis,
  getTopProductsStats,
  exportOrdersCsv,
  exportProductsCsv,
  exportOrdersExcel,
} = require("../controllers/StatsController");
const { verifyEmployeToken } = require("../../middleware/authMiddleware");
const { requireVendeur } = require("../../middleware/roleMiddleware");

router.get("/kpi", verifyEmployeToken, requireVendeur, getKpis);
router.get("/top-products", verifyEmployeToken, requireVendeur, getTopProductsStats);
router.get("/exports/commandes.csv", verifyEmployeToken, requireVendeur, exportOrdersCsv);
router.get("/exports/commandes.xls", verifyEmployeToken, requireVendeur, exportOrdersExcel);
router.get("/exports/produits.csv", verifyEmployeToken, requireVendeur, exportProductsCsv);

module.exports = router;
