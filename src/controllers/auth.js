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

    // Validation des champs avant de vérifier la base de données
    const errors = {};

    // Validation de l'email
    if (!email) {
      errors.email = "L'adresse email est requise";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      errors.email = "Veuillez entrer une adresse email valide";
    }

    // Validation du mot de passe
    if (!password) {
      errors.password = "Le mot de passe est requis";
    } else if (password.length < 8) {
      errors.password = "Le mot de passe doit contenir au moins 8 caractères";
    }

    // Validation du prénom
    if (!firstName || firstName.trim() === '') {
      errors.firstName = "Le prénom est requis";
    }

    // Validation du nom
    if (!lastName || lastName.trim() === '') {
      errors.lastName = "Le nom est requis";
    }

    // Si des erreurs de validation sont détectées, renvoyer un message d'erreur détaillé
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: "Veuillez corriger les erreurs suivantes",
        errors
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        message: "Cette adresse email est déjà utilisée",
        errors: { email: "Un compte existe déjà avec cette adresse email" }
      });
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
    
    // Template HTML amélioré pour l'email
    const htmlMessage = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenue sur ScribeAI</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            max-width: 150px;
          }
          h1 {
            color: #2c3e50;
          }
          .button {
            display: inline-block;
            background-color: #3498db;
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 4px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            font-size: 0.9em;
            color: #7f8c8d;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Bienvenue sur ScribeAI, ${firstName} !</h1>
        </div>
        <p>Merci de vous être inscrit à notre plateforme. Nous sommes ravis de vous compter parmi nos utilisateurs.</p>
        <p>Pour finaliser votre inscription et commencer à utiliser tous nos services, veuillez cliquer sur le bouton ci-dessous :</p>
        <div style="text-align: center;">
          <a href="${verificationUrl}" class="button">Vérifier mon compte</a>
        </div>
        <p><strong>Attention :</strong> Ce lien expire dans 24 heures.</p>
        <p>Si vous n'avez pas créé de compte sur ScribeAI, veuillez ignorer cet email.</p>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ScribeAI. Tous droits réservés.</p>
          <p>Pour toute question, contactez notre support à <a href="mailto:support@scribeai.com">support@scribeai.com</a></p>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      email: user.email,
      subject: 'Bienvenue sur ScribeAI - Vérification de votre compte',
      message: htmlMessage
    });

    // Réponse appropriée
    res.status(201).json({
      success: true,
      message: `Bienvenue ${firstName} ! Votre compte a été créé avec succès. Nous vous avons envoyé un email de vérification à l'adresse ${email}. Veuillez cliquer sur le lien dans cet email pour activer votre compte.`
    });
  } catch (error) {
    console.error('Erreur d\'enregistrement:', error);
    
    // Gestion des erreurs spécifiques
    if (error.name === 'ValidationError') {
      const errors = {};
      
      // Formatage des erreurs de validation Mongoose
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      
      return res.status(400).json({
        message: "Certaines informations fournies ne sont pas valides",
        errors
      });
    }
    
    // Erreur générique
    res.status(500).json({
      message: "Une erreur inattendue est survenue lors de la création de votre compte. Veuillez réessayer ultérieurement.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
    const resetUrl = `https://scribe-ai-frontend.vercel.app/reset-password/${resetToken}`;
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