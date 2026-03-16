// Mode Client

const db = require("../../db");
const bcrypt = require("bcryptjs");

// Rechercher un client par son id 
// AJOUT - nouvelle fonction


//Rechercher un client par email
const findClientByEmail = async (email) => {
  const [rows] = await db.query(
    `SELECT
      id_client,
      nom_client,
      prenom_client,
      email_client,
      mot_de_passe_client,
      adresse_facturation,
      cp_facturation,
      ville_facturation,
      adresse_livraison,
      cp_livraison,
      ville_livraison,
      telephone_client
     FROM clients
     WHERE email_client = ?`,
    [email],
  );
  return rows;
};

// Créer un nouveau client
const createClient = async (clientData) => {
  const {
    nom,
    prenom,
    email,
    mot_de_passe,
    adresse_facturation,
    ville_facturation,
    cp_facturation,
    adresse_livraison,
    cp_livraison,
    ville_livraison,
    telephone,
  } = clientData;

  const [result] = await db.query(
    `INSERT INTO clients
    (nom_client, prenom_client,email_client, mot_de_passe_client,adresse_facturation, cp_facturation,
   ville_facturation, adresse_livraison, cp_livraison, ville_livraison
    ,telephone_client )
    VALUE (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nom,
      prenom,
      email,
      mot_de_passe,
      adresse_facturation || null,
      cp_facturation || null,
      ville_facturation || null,
      adresse_livraison || null,
      cp_livraison || null,
      ville_livraison || null,
      telephone || null,
    ],
  );
  return result;
};

//Hacher un mdp
const hashPassword = async (password) => {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
  return await bcrypt.hash(password, rounds);
  //ou en entier => return await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);
};

// Comparer un mot de passe
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Récupérer un client par ID
const findClientById = async (id) => {
  const [rows] = await db.query(
    `SELECT
      id_client,
      nom_client,
      prenom_client,
      email_client,
      adresse_facturation,
      cp_facturation,
      ville_facturation,
      adresse_livraison,
      cp_livraison,
      ville_livraison,
      telephone_client
     FROM clients
     WHERE id_client = ?`,
    [id]
  );
  return rows;
};

// Mettre à jour le profil client
const updateClient = async (id, data) => {
  const {
    nom, prenom, telephone,
    adresse_facturation, cp_facturation, ville_facturation,
    adresse_livraison, cp_livraison, ville_livraison,
  } = data;

  const [result] = await db.query(
    `UPDATE clients SET nom_client = ?, prenom_client = ?, telephone_client = ?,
     adresse_facturation = ?, cp_facturation = ?, ville_facturation = ?,
     adresse_livraison = ?, cp_livraison = ?, ville_livraison = ?
     WHERE id_client = ?`,
    [nom, prenom, telephone || null,
     adresse_facturation || null, cp_facturation || null, ville_facturation || null,
     adresse_livraison || null, cp_livraison || null, ville_livraison || null, id]
  );
  return result;
};

// Mettre à jour le mot de passe client
const updateClientPassword = async (id, hashedPassword) => {
  const [result] = await db.query(
    "UPDATE clients SET mot_de_passe_client = ? WHERE id_client = ?",
    [hashedPassword, id]
  );
  return result;
};

// Récupérer tous les clients (dashboard)
const getAllClients = async () => {
  const [rows] = await db.query(
    "SELECT id_client, nom_client, prenom_client, email_client, telephone_client, ville_facturation FROM clients"
  );
  return rows;
};

// Rechercher des clients
const searchClients = async (search) => {
  const like = `%${search}%`;
  const [rows] = await db.query(
    `SELECT id_client, nom_client, prenom_client, email_client, telephone_client
     FROM clients
     WHERE nom_client LIKE ? OR prenom_client LIKE ? OR email_client LIKE ?`,
    [like, like, like]
  );
  return rows;
};

module.exports = {
  findClientByEmail,
  findClientById,
  createClient,
  updateClient,
  updateClientPassword,
  getAllClients,
  searchClients,
  hashPassword,
  comparePassword,
  
};
