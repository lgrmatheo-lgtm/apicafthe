// Client Router // chemin : /api/clients
const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getMe,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  getAll,
  getClientById,
  requestPasswordReset,
  resetPasswordWithToken,
  getClientHistory,
  getMyHistory,
} = require("../controllers/ClientControllers");
const { verifyToken, verifyEmployeToken } = require("../../middleware/authMiddleware");
const { requireVendeur } = require("../../middleware/roleMiddleware");

// Vérification de session du client route protégée  GET api/clients/me
router.get("/me", verifyToken, getMe)

// Déconnexion route protégée GET api/clients/logout
router.post("/logout", logout)
// Routes publiques

// POST /api/clients/register - Inscription
router.post("/register", register);

// POST /api/clients/login - Connexion
router.post("/login", login);
router.post("/password/request-reset", requestPasswordReset);
router.post("/password/reset", resetPasswordWithToken);

// Routes client connecté

// GET /api/clients/profile - Mon profil
router.get("/profile", verifyToken, getProfile);

// PUT /api/clients/profile - Modifier mon profil
router.put("/profile", verifyToken, updateProfile);

// PUT /api/clients/password - Changer mon mot de passe
router.put("/password", verifyToken, changePassword);
router.get("/me/history", verifyToken, getMyHistory);

// Routes dashboard (vendeur/admin)

// GET /api/clients - Liste des clients (avec recherche optionnelle ?search=)
router.get("/", verifyEmployeToken, requireVendeur, getAll);

// GET /api/clients/:id - Détail d'un client
router.get("/:id", verifyEmployeToken, requireVendeur, getClientById);
router.get("/:id/history", verifyEmployeToken, requireVendeur, getClientHistory);

module.exports = router;
