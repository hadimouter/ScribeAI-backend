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

    // Générer le token de vérification
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Créer le nouvel utilisateur
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      verificationToken,
      verificationTokenExpiry: Date.now() + 24 * 60 * 60 * 1000, // 24 heures
      isEmailVerified: false
    });

    // Envoyer l'email de vérification
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    await sendEmail({
      email: user.email,
      subject: 'Vérification de votre compte ScribeAI',
      message: `
        <h1>Bienvenue sur ScribeAI !</h1>
        <p>Pour finaliser votre inscription, veuillez cliquer sur le lien suivant :</p>
        <a href="${verificationUrl}">Vérifier mon compte</a>
        <p>Ce lien expire dans 24 heures.</p>
      `
    });

    // Ne pas connecter l'utilisateur avant la vérification
    res.status(201).json({
      message: "Compte créé avec succès. Veuillez vérifier votre email pour activer votre compte."
    });
  } catch (error) {
    res.status(400).json({ message: "Une erreur est survenue lors de l'enregistrement." });
  }
};


const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: "Le lien de vérification est invalide ou a expiré."
      });
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    // Générer le token JWT pour la connexion automatique
    const authToken = generateToken(user._id);

    res.json({
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      token: authToken
    });
  } catch (error) {
    res.status(500).json({
      message: "Une erreur est survenue lors de la vérification."
    });
  }
};


const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: "Email ou mot de passe incorrect."
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Veuillez vérifier votre email avant de vous connecter."
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Email ou mot de passe incorrect."
      });
    }

    const token = generateToken(user._id);

    res.json({
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      token
    });
  } catch (error) {
    res.status(400).json({
      message: "Une erreur est survenue lors de la connexion."
    });
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
  resetPassword,
  verifyEmail
};