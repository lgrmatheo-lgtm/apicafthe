// Contrôleur Clients
const {
  createClient,
  findClientByEmail,
  findClientById,
  updateClient,
  updateClientPassword,
  getAllClients,
  searchClients,
  hashPassword,
  comparePassword,
} = require("../models/ClientModel");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
  createPasswordResetToken,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
  purgeExpiredPasswordResetTokens,
} = require("../models/PasswordResetModel");
const { getOrdersByClientId } = require("../../order/models/OrderModel");
const { isValidEmail, isNonEmptyString, toPositiveInt } = require("../../utils/validation");

// Inscription
const register = async (req, res) => {
  try {
    const { nom, prenom, email, mot_de_passe } = req.body;
    const normalizedEmail = typeof email === "string" ? email.trim() : "";

    if (
      !isNonEmptyString(nom) ||
      !isNonEmptyString(prenom) ||
      !isValidEmail(normalizedEmail) ||
      !isNonEmptyString(mot_de_passe)
    ) {
      return res.status(400).json({
        message: "nom, prenom, email valide et mot_de_passe sont requis",
      });
    }

    // Vérifier si l'email existe déjà
    const existingClient = await findClientByEmail(normalizedEmail);

    if (existingClient.length > 0) {
      return res.status(400).send({
        message: "Cet email est déjà utilisé",
      });
    }

    // Hacher le mdp
    const hash = await hashPassword(mot_de_passe);

    //Crée le client
    const result = await createClient({
      nom,
      prenom,
      email: normalizedEmail,
      mot_de_passe: hash,
    });

    res.status(201).json({
      message: "Inscription réussie",
      client_id: result.insertId,
    });
  } catch (error) {
    console.error("Erreur inscription", error.message);
    res.status(500).json({
      message: "Erreur lors de l'inscription",
    });
  }
};

// Connexion
const login = async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;
    const normalizedEmail = typeof email === "string" ? email.trim() : "";

    if (!isValidEmail(normalizedEmail) || !isNonEmptyString(mot_de_passe)) {
      return res.status(400).json({
        message: "Email et mot_de_passe valides sont requis",
      });
    }

    //Recherché le client
    const clients = await findClientByEmail(normalizedEmail);

    if (clients.length === 0) {
      return res.status(401).json({
        message: "Identifiants incorrects",
      });
    }

    const client = clients[0];

    // Client créé en magasin sans mdp → première connexion
    if (!client.mot_de_passe_client && mot_de_passe) {
      const hash = await hashPassword(mot_de_passe);
      await updateClientPassword(client.id_client, hash);
    } else {
      // Vérifier le mdp
      const isMatch = await comparePassword(mot_de_passe, client.mot_de_passe_client);

      if (!isMatch) {
        return res.status(401).json({
          message: "Identifiants incorrects",
        });
      }
    }

    // Générer le token JWT
    const expire = parseInt(process.env.JWT_EXPIRES_IN, 10) || 3600;
    const token = jwt.sign(
      {
        id: client.id_client,
        email: client.email_client,
      },
      process.env.JWT_SECRET,
      { expiresIn: expire},
    );

    //On place le token dans un cookie HttpOnly
        res.cookie("token", token, {
      httpOnly: true,
      secure: false, // Mettre en true au d"ploiment( marche que htpps)
      sameSite: "lax",
      maxAge: expire * 1000,
    });

    res.json({
      message: "Connexion réussie",
      token,
      client: {
        id: client.id_client,
        nom: client.nom_client,
        prenom: client.prenom_client,
        email: client.email_client,
      },
    });
  } catch (error) {
    console.error("Erreur de connexion utilisateur", error.message);
    res.status(500).json({
      message: "Erreur lors de la connexion",
    });
  }
};

// Récupérer mon profil (client connecté)
const getProfile = async (req, res) => {
  try {
    const clients = await findClientById(req.client.id);

    if (clients.length === 0) {
      return res.status(404).json({ message: "Client non trouvé" });
    }

    res.json({
      message: "Profil récupéré",
      client: clients[0],
    });
  } catch (error) {
    console.error("Erreur profil client", error.message);
    res.status(500).json({ message: "Erreur lors de la récupération du profil" });
  }
};

// Mettre à jour mon profil
const updateProfile = async (req, res) => {
  try {
    const clientId = req.client.id;
    const clients = await findClientById(clientId);

    if (clients.length === 0) {
      return res.status(404).json({ message: "Client non trouvé" });
    }

    const existing = clients[0];

    await updateClient(clientId, {
      nom: req.body.nom || existing.nom_client,
      prenom: req.body.prenom || existing.prenom_client,
      telephone: req.body.telephone !== undefined ? req.body.telephone : existing.telephone_client,
      adresse_facturation: req.body.adresse_facturation !== undefined ? req.body.adresse_facturation : existing.adresse_facturation,
      cp_facturation: req.body.cp_facturation !== undefined ? req.body.cp_facturation : existing.cp_facturation,
      ville_facturation: req.body.ville_facturation !== undefined ? req.body.ville_facturation : existing.ville_facturation,
      adresse_livraison: req.body.adresse_livraison !== undefined ? req.body.adresse_livraison : existing.adresse_livraison,
      cp_livraison: req.body.cp_livraison !== undefined ? req.body.cp_livraison : existing.cp_livraison,
      ville_livraison: req.body.ville_livraison !== undefined ? req.body.ville_livraison : existing.ville_livraison,
    });

    res.json({ message: "Profil mis à jour avec succès" });
  } catch (error) {
    console.error("Erreur mise à jour profil", error.message);
    res.status(500).json({ message: "Erreur lors de la mise à jour du profil" });
  }
};

// Changer le mot de passe
const changePassword = async (req, res) => {
  try {
    const { ancien_mdp, nouveau_mdp } = req.body;

    if (!ancien_mdp || !nouveau_mdp) {
      return res.status(400).json({ message: "Ancien et nouveau mot de passe requis" });
    }

    const clients = await findClientByEmail(req.client.email);
    const client = clients[0];

    const isMatch = await comparePassword(ancien_mdp, client.mot_de_passe_client);
    if (!isMatch) {
      return res.status(401).json({ message: "Ancien mot de passe incorrect" });
    }

    const hash = await hashPassword(nouveau_mdp);
    await updateClientPassword(req.client.id, hash);

    res.json({ message: "Mot de passe modifié avec succès" });
  } catch (error) {
    console.error("Erreur changement mdp", error.message);
    res.status(500).json({ message: "Erreur lors du changement de mot de passe" });
  }
};

// Récupérer tous les clients (dashboard)
const getAll = async (req, res) => {
  try {
    const { search } = req.query;

    let clients;
    if (search) {
      clients = await searchClients(search);
    } else {
      clients = await getAllClients();
    }

    res.json({
      message: "Clients récupérés avec succès",
      count: clients.length,
      clients,
    });
  } catch (error) {
    console.error("Erreur récupération clients", error.message);
    res.status(500).json({ message: "Erreur lors de la récupération des clients" });
  }
};

// Récupérer un client par ID (dashboard)
const getClientById = async (req, res) => {
  try {
    const clientId = toPositiveInt(req.params.id);
    if (!clientId) {
      return res.status(400).json({ message: "Identifiant client invalide" });
    }

    const clients = await findClientById(clientId);

    if (clients.length === 0) {
      return res.status(404).json({ message: "Client non trouvé" });
    }

    res.json({
      message: "Client récupéré",
      client: clients[0],
    });
  } catch (error) {
    console.error("Erreur récupération client", error.message);
    res.status(500).json({ message: "Erreur lors de la récupération du client" });
  }
};

//Fonction de déconnexion
const logout = (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: false, // mettre sur true en htpps ( au déploiment marche que en https)
        sameSite: "lax"
    });
    res.json({ message: "Déconnexion réussie" });
};
//automatiquement, le navigateur envoie les cookie le mmiddleware verifie le jwt si le token est valide on retgourne les info du client
const getMe = async (req, res) => {
    try {
        // req.client.id vient du JWT decode par le middleware verifyToken
        const clients = await findClientById(req.client.id);

        if (clients.length === 0) {
            return res.status(404).json({ message: "Client introuvable" });
        }

        const client = clients[0];

        res.json({
            client: {
                id: client.id_client,
                nom: client.nom_client,
                prenom: client.prenom_client,
                email: client.email_client
            }
        });
    } catch (error) {
        console.error("Erreur /me:", error.message);
        res.status(500).json({ message: "Erreur lors de la vérification de session" });
    }
};

const requestPasswordReset = async (req, res) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim() : "";
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Email invalide" });
    }

    await purgeExpiredPasswordResetTokens();
    const clients = await findClientByEmail(email);
    if (clients.length === 0) {
      return res.json({
        message: "Si le compte existe, un lien de réinitialisation a été généré",
      });
    }

    const client = clients[0];
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    await createPasswordResetToken(
      client.id_client,
      tokenHash,
      new Date(Date.now() + 15 * 60 * 1000),
    );

    const response = {
      message: "Si le compte existe, un lien de réinitialisation a été généré",
    };

    if (process.env.NODE_ENV !== "production") {
      response.reset_token = rawToken;
      response.expires_in_seconds = 900;
    }

    return res.json(response);
  } catch (error) {
    console.error("Erreur demande reset mot de passe", error.message);
    return res.status(500).json({
      message: "Erreur lors de la demande de réinitialisation",
    });
  }
};

const resetPasswordWithToken = async (req, res) => {
  try {
    const token = typeof req.body.token === "string" ? req.body.token.trim() : "";
    const nouveauMdp = req.body.nouveau_mdp;

    if (!isNonEmptyString(token) || !isNonEmptyString(nouveauMdp)) {
      return res.status(400).json({
        message: "token et nouveau_mdp sont requis",
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const resetToken = await findValidPasswordResetToken(tokenHash);

    if (!resetToken) {
      return res.status(400).json({
        message: "Token invalide ou expiré",
      });
    }

    const hash = await hashPassword(nouveauMdp);
    await updateClientPassword(resetToken.id_client, hash);
    await markPasswordResetTokenUsed(resetToken.id);

    return res.json({
      message: "Mot de passe réinitialisé avec succès",
    });
  } catch (error) {
    console.error("Erreur reset mot de passe", error.message);
    return res.status(500).json({
      message: "Erreur lors de la réinitialisation du mot de passe",
    });
  }
};

const getClientHistory = async (req, res) => {
  try {
    const clientId = toPositiveInt(req.params.id);
    if (!clientId) {
      return res.status(400).json({ message: "Identifiant client invalide" });
    }

    const clients = await findClientById(clientId);
    if (clients.length === 0) {
      return res.status(404).json({ message: "Client non trouvé" });
    }

    const historique = await getOrdersByClientId(clientId);
    return res.json({
      message: "Historique client récupéré",
      client: clients[0],
      count: historique.length,
      historique,
    });
  } catch (error) {
    console.error("Erreur historique client", error.message);
    return res.status(500).json({
      message: "Erreur lors de la récupération de l'historique client",
    });
  }
};

const getMyHistory = async (req, res) => {
  try {
    const historique = await getOrdersByClientId(req.client.id);
    return res.json({
      message: "Historique récupéré",
      count: historique.length,
      historique,
    });
  } catch (error) {
    console.error("Erreur historique /me", error.message);
    return res.status(500).json({
      message: "Erreur lors de la récupération de l'historique",
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  getAll,
  getClientById,
  logout,
  getMe,
  requestPasswordReset,
  resetPasswordWithToken,
  getClientHistory,
  getMyHistory,
};
