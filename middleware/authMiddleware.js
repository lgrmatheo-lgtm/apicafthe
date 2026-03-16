// Middleware d'authentification JWT
// Vérifié que le token JWT est valide pour protéger les routes

const jwt = require("jsonwebtoken");
const { normalizeRole } = require("../utils/validation");

const verifyToken = (req, res, next) => {
    // Cherche le token dans le cookie HttpOnly
    let token = req.cookies && req.cookies.token;

    // header Authorization 
    if (!token) {
        const authHeader = req.headers["authorization"];

        if (!authHeader) {
            return res.status(403).json({ message: "Token manquant" });
        }

        const parts = authHeader.split(" ");

        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return res.status(403).json({ message: "Format de token invalide" });
        }

        token = parts[1];
    }
  // Vérifier le token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Token expiré",
        });
      }

      return res.status(401).json({
        message: "Token invalide",
      });
    }

    // Token valide : on ajoute les infos du client à la requête
    req.client = decoded;
    next();
  });
};

// Vérification du token employé (dashboard)
const verifyEmployeToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(403).json({
      message: "Token manquant",
    });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(403).json({
      message: "Format de token invalide",
    });
  }

  const token = parts[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Session expirée, veuillez vous reconnecter",
        });
      }

      return res.status(401).json({
        message: "Token invalide",
      });
    }

    // Vérifier que c'est bien un token employé
    const normalizedRole = normalizeRole(decoded.role);
    if (!normalizedRole) {
      return res.status(403).json({
        message: "Accès refusé : token client non autorisé",
      });
    }

    req.employe = {
      ...decoded,
      role: normalizedRole,
    };
    next();
  });
};

module.exports = { verifyToken, verifyEmployeToken };
