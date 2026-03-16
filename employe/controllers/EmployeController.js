const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  findEmployeByEmail,
  findEmployeById,
  updateEmployePassword,
} = require("../models/EmployeModel");
const { isValidEmail, isNonEmptyString, normalizeRole } = require("../../utils/validation");

const getJwtTtlInSeconds = () => {
  const ttl = Number.parseInt(process.env.JWT_EXPIRES_IN, 10);
  if (Number.isFinite(ttl) && ttl > 0) {
    return ttl;
  }
  return 3600;
};

const loginEmploye = async (req, res) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim() : "";
    const motDePasse = req.body.mot_de_passe;

    if (!isValidEmail(email) || !isNonEmptyString(motDePasse)) {
      return res.status(400).json({
        message: "Email et mot_de_passe valides sont requis",
      });
    }

    const employe = await findEmployeByEmail(email);
    if (!employe) {
      return res.status(401).json({ message: "Identifiants incorrects" });
    }

    const storedPassword = employe.mot_de_passe || "";
    let passwordValid = false;

    if (storedPassword.startsWith("$2")) {
      passwordValid = await bcrypt.compare(motDePasse, storedPassword);
    } else {
      passwordValid = motDePasse === storedPassword;
      if (passwordValid) {
        const rounds = Number.parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
        const hashed = await bcrypt.hash(motDePasse, rounds);
        await updateEmployePassword(employe.id_employe, hashed);
      }
    }

    if (!passwordValid) {
      return res.status(401).json({ message: "Identifiants incorrects" });
    }

    const role = normalizeRole(employe.role);
    const expiresIn = getJwtTtlInSeconds();
    const token = jwt.sign(
      {
        id: employe.id_employe,
        email: employe.email,
        role,
      },
      process.env.JWT_SECRET,
      { expiresIn },
    );

    return res.json({
      message: "Connexion employé réussie",
      token,
      employe: {
        id: employe.id_employe,
        nom: employe.nom,
        prenom: employe.prenom,
        email: employe.email,
        role,
      },
    });
  } catch (error) {
    console.error("Erreur connexion employe", error.message);
    return res.status(500).json({ message: "Erreur lors de la connexion employé" });
  }
};

const getEmployeMe = async (req, res) => {
  try {
    const employe = await findEmployeById(req.employe.id);
    if (!employe) {
      return res.status(404).json({ message: "Employé introuvable" });
    }

    return res.json({
      employe: {
        id: employe.id_employe,
        nom: employe.nom,
        prenom: employe.prenom,
        email: employe.email,
        telephone: employe.telephone,
        role: normalizeRole(employe.role),
      },
    });
  } catch (error) {
    console.error("Erreur recuperation profil employe", error.message);
    return res.status(500).json({ message: "Erreur lors de la récupération du profil employé" });
  }
};

module.exports = {
  loginEmploye,
  getEmployeMe,
};
