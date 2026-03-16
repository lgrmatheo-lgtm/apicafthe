const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");

// Permet de charger les variables d'env depuis.env
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Connexion à la bdd (bases de données)
const db = require("./db");

// === Importation des routes ===
const articleRoutes = require("./article/routes/ArticleRouter");
const clientRoutes = require("./client/routes/ClientRouter");
const orderRoutes = require("./order/routes/OrderRouter");
const employeRoutes = require("./employe/routes/EmployeRouter");
const statsRoutes = require("./stats/routes/StatsRouter");

// Création de l'application Express
const app = express();
app.disable("x-powered-by");

// MIDDLEWARES
// Parser les JSON
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-XSS-Protection", "0");
  next();
});

// Logger de requêtes HTTP dans la console
// Logger de requetes HTTP dans la console (ignorer les preflight OPTIONS)
app.use(
  morgan("dev", {
    skip: (req) => req.method === "OPTIONS",
  }),
);

//Sert les fichiers statistiques (images, produits)
app.use(express.static("public"));

// Permet les requêtes cross origin (qui viennent du front)
// CORS = Cross-Origin Ressource Sharing
// OBLIGATOIRE sinon le navigateur bloque les requêtes

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

//Parser les cookies dans req
 app.use(cookieParser());

// ROUTES

// Route de test pour vérifier que l'api fonctionne
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "API fonctionnelle",
  });
});
app.get("/openapi.yaml", (req, res) => {
  res.sendFile(path.join(__dirname, "openapi.yaml"));
});

// Routes de l'API
app.use("/api/articles", articleRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/employes", employeRoutes);
app.use("/api/stats", statsRoutes);

// GESTIONS DES ERREURS
// Routes 404
app.use((req, res) => {
  res.status(404).json({
    message: "Route non trouvée",
  });
});

// DÉMARRAGE DU SERVEUR
const port = process.env.PORT || 3000;
// Ecoute sur toutes les interfaces pour eviter les soucis IPv4/IPv6 (Postman -> 127.0.0.1)
const host = process.env.HOST || "0.0.0.0";

const server = app.listen(port, host, () => {
  console.log(`Serveur démarré sur http://${host}:${port}`);
});

module.exports = { app, server };
