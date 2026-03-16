//Routeur  pour les articles
//Chemin : /api/articles

const express = require('express');
const {
  getAll,
  getById,
  getByCategory,
  create,
  update,
  remove,
} = require("../controllers/ArticleController");
const router = express.Router();
const { verifyEmployeToken } = require("../../middleware/authMiddleware");
const { requireVendeur } = require("../../middleware/roleMiddleware");


//GET /api/articles - Récupère tous les articles
router.get('/', getAll);

//GET /api/articles/:categorie - Récupère un article par sa catégorie
router.get('/categorie/:categorie', getByCategory);

//GET /api/articles/:id - Récupère un article par son id
router.get('/:id', getById);

//POST /api/articles - Créer un article (vendeur/admin)
router.post("/", verifyEmployeToken, requireVendeur, create);

//PUT /api/articles/:id - Modifier un article (vendeur/admin)
router.put("/:id", verifyEmployeToken, requireVendeur, update);

//DELETE /api/articles/:id - Désactiver un article (soft delete)
router.delete("/:id", verifyEmployeToken, requireVendeur, remove);

module.exports = router;
