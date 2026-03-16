const express = require("express");
const router = express.Router();
const {
  createOnlineOrder,
  createStoreSale,
  changeOrderStatus,
  getMyOrders,
  getOrderForDashboard,
} = require("../controllers/OrderController");
const { verifyToken, verifyEmployeToken } = require("../../middleware/authMiddleware");
const { requireVendeur } = require("../../middleware/roleMiddleware");

router.get("/my", verifyToken, getMyOrders);
router.post("/online", verifyToken, createOnlineOrder);
router.post("/magasin", verifyEmployeToken, requireVendeur, createStoreSale);
router.patch("/:id/status", verifyEmployeToken, requireVendeur, changeOrderStatus);
router.get("/:id", verifyEmployeToken, requireVendeur, getOrderForDashboard);

module.exports = router;
