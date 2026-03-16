// Permet de configurer le pool de connexions à MYSQL
// Pour faire des requêtes asynchrones asyc/wait

const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Pool de connexions
// Permet de gérer plusieurs connexions simulatanées
// Réutiliser des connexions existantes
// Gestion automatique de la disponibilité
// Limite le nb de connexions (en mêm temps)

const db = mysql.createPool({
    // Paramètre de connexion ( host  nom utilisateur mot de passe nom de la bdd)

    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // PARAMETRE DU POOL
    // si plus de connexions dispo elles attendent
    waitForConnections: true,
    // Limiter nombre max de connexion
    connectionLimit: 10,

    // Parametre optionel mais recommandé
    // permet en cas echec de connexion de ressayer
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    // Timeout de connexion de (millisecondes)
    connectTimeout: 10000, // 10secondes
});

(async () => {
    try{
        const connection = await db.getConnection();
        console.log("Connecté a la base de données MySQL");

        //Se deconnecte
    }catch (err){
        console.error("Erreur de connexion à la base de données MySQL", err.message);

        //arret de l'application avec code erreur 1
        process.exit(1);

    }
})();

module.exports = db;





