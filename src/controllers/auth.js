const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Un utilisateur avec cet email existe déjà." });
    }

    // Créer le nouvel utilisateur
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
    });

    // Générer le token
    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      token,
    });
  } catch (error) {
    res.status(400).json({ message: "Une erreur est survenue lors de l'enregistrement. Veuillez réessayer." });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Trouver l'utilisateur
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Adresse email ou mot de passe incorrect." });
    }

    // Vérifier le mot de passe
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Adresse email ou mot de passe incorrect." });
    }

    // Générer le token
    const token = generateToken(user._id);

    res.json({
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      token,
    });
  } catch (error) {
    res.status(400).json({ message: "Une erreur est survenue lors de la connexion. Veuillez réessayer." });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: "Une erreur est survenue lors de la récupération des informations. Veuillez réessayer." });
  }
};



const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Vérifiez si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Créer un lien de réinitialisation
    const resetUrl = `http://localhost:3001/reset-password/${resetToken}`;
    const message = `
      <p>Vous avez demandé une réinitialisation de mot de passe.</p>
      <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
      <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
      <p>Si vous n'avez pas demandé cela, ignorez cet email.</p>
    `;

    await sendEmail({
      email: user.email,
      subject: 'Réinitialisation de votre mot de passe',
      message,
    });

    res.status(200).json({ message: 'Email de réinitialisation envoyé.' });
  } catch (error) {
    res.status(500).json({ message: 'Une erreur est survenue. Veuillez réessayer.' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const resetToken = req.params.token;
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Vérifiez si le token est valide et n'a pas expiré
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Token invalide ou expiré.' });
    }

    // Réinitialiser le mot de passe
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (error) {
    res.status(500).json({ message: 'Une erreur est survenue. Veuillez réessayer.' });
  }
};


module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword
};