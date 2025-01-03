const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const connectDB = require('./src/config/database');

const authRoutes = require('./src/routes/auth');
const aiRoutes = require('./src/routes/ai');
const userRoutes = require('./src/routes/users');
const documentRoutes = require('./src/routes/documents');
const folderRoutes = require('./src/routes/folders');
const paymentRoutes = require('./src/routes/payments');
const shareRoutes = require('./src/routes/share');
const studyRoutes = require('./src/routes/study');

const app = express();

// Middleware
app.use(cors());

// Configuration spéciale pour le webhook Stripe
app.use('/api/payments/webhook', bodyParser.raw({ type: 'application/json' }));

// Middleware pour parser le JSON pour toutes les autres routes
app.use(bodyParser.json());

// Connexion à la base de données
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/study', studyRoutes);

// Routes de base
app.get('/', (req, res) => {
  res.send('API is running');
});

// Gestion des erreurs globale
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
