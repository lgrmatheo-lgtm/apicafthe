const express = require("express");
const router = express.Router();
const { loginEmploye, getEmployeMe } = require("../controllers/EmployeController");
const { verifyEmployeToken } = require("../../middleware/authMiddleware");

router.post("/login", loginEmploye);
router.get("/me", verifyEmployeToken, getEmployeMe);

module.exports = router;
