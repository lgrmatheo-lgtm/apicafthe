// Middleware de gestion des roles pour les employes
const { normalizeRole } = require("../utils/validation");

const requireVendeur = (req, res, next) => {
  const role = normalizeRole(req.employe && req.employe.role);

  if (!role) {
    return res.status(403).json({ message: "Acces refuse : role manquant" });
  }

  // Autoriser vendeur et admin par defaut
  if (role === "vendeur" || role === "admin") {
    return next();
  }

  return res.status(403).json({ message: "Acces refuse : role insuffisant" });
};

module.exports = { requireVendeur };
