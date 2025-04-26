const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { pool } = require('../database');
const helmet = require('helmet');
const crypto = require('crypto');

const router = express.Router();

// Générer une clé secrète si elle n'existe pas
if (!process.env.SECRET_KEY) {
    const secretKey = crypto.randomBytes(64).toString('hex');
    console.warn('Avertissement: SECRET_KEY non défini, génération d\'une clé temporaire:', secretKey);
    process.env.SECRET_KEY = secretKey;
}

// Limite de tentatives de connexion (5 tentatives en 15 minutes par utilisateur)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limite par utilisateur
    message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes',
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
        return req.body.username ? req.body.username : 'unknown';
    },
    handler: (req, res) => {
        res.status(429).json({
            message: 'Trop de tentatives. Veuillez patienter 15 minutes avant de réessayer'
        });
    }
});

// Appliquer la limite de taux
router.use('/login', loginLimiter);

// Route de connexion
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';

    if (!username || !password) {
        return res.status(400).json({ message: 'Nom d\'utilisateur et mot de passe requis' });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ message: 'Données d\'entrée non valides' });
    }

    const connection = await pool.getConnection();
    try {
        // Vérifier les tentatives récentes
        const [failedAttempts] = await connection.execute(
            'SELECT COUNT(*) AS count FROM failed_login_attempts WHERE username = ? AND attempt_time > DATE_SUB(NOW(), INTERVAL 15 MINUTE)',
            [username]
        );

        if (failedAttempts[0].count >= 5) {
            return res.status(429).json({ 
                message: 'Compte temporairement bloqué. Réessayez dans 15 minutes' 
            });
        }

        // Recherche de l'utilisateur
        const [rows] = await connection.execute(
            'SELECT id, username, password, created_at, increased_avance_days, increased_driving_days, admin, nomeschool FROM responsables WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            await connection.execute(
                'INSERT INTO failed_login_attempts (ip_address, username) VALUES (?, ?)',
                [ipAddress, username]
            );
            return res.status(401).json({ message: "Identifiant ou mot de passe incorrect" });
        }

        const responsable = rows[0];

        // Vérification du mot de passe
        const isPasswordValid = await bcrypt.compare(password, responsable.password);
        if (!isPasswordValid) {
            await connection.execute(
                'INSERT INTO failed_login_attempts (ip_address, username) VALUES (?, ?)',
                [ipAddress, username]
            );
            return res.status(401).json({ message: "Identifiant ou mot de passe incorrect" });
        }

        // Vérification des sessions actives
        const [activeSessions] = await connection.execute(
            'SELECT * FROM active_sessions WHERE user_id = ?',
            [responsable.id]
        );

        if (activeSessions.length > 4) {
            return res.status(403).json({ 
                message: "Connexion impossible: session déjà active sur un autre appareil" 
            });
        }

        // Création du token JWT
        const token = jwt.sign(
            { 
                id: responsable.id, 
                username: responsable.username,
                auth: crypto.randomBytes(16).toString('hex')
            },
            process.env.SECRET_KEY,
            { 
                expiresIn: '12h',
                issuer: 'your-app-name',
                algorithm: 'HS256'
            }
        );

        // Enregistrement de la session
        await connection.execute(
            'INSERT INTO active_sessions (user_id, token, ip_address, user_agent) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE token = ?, ip_address = ?, user_agent = ?, created_at = CURRENT_TIMESTAMP',
            [responsable.id, token, ipAddress, userAgent, token, ipAddress, userAgent]
        );

        // Nettoyage des tentatives échouées
        await connection.execute(
            'DELETE FROM failed_login_attempts WHERE username = ?',
            [username]
        );

        // Configuration du cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 12 * 60 * 60 * 1000
        });

        // Réponse de succès
        res.status(200).json({
            message: 'Connexion réussie',
            token: token,
            user: {
                id: responsable.id,
                username: responsable.username,
                created_at: responsable.created_at,
                increased_avance_days: responsable.increased_avance_days,
                increased_driving_days: responsable.increased_driving_days,
                nomeschool: responsable.nomeschool,
                admin: responsable.admin
            },
        });
    } catch (err) {
        console.error('Erreur de connexion:', err.message);
        res.status(500).json({ message: 'Erreur lors de la tentative de connexion', error: err.message });
    } finally {
        connection.release();
    }
});

// Déconnexion avec améliorations de sécurité
router.post('/logout', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    
    if (!token) {
        return res.status(400).json({ message: 'Token d\'authentification requis' });
    }

    const connection = await pool.getConnection();
    try {
        // Vérifier la validité du token
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        
        // Supprimer la session active
        await connection.execute(
            'DELETE FROM active_sessions WHERE user_id = ?',
            [decoded.id]
        );
        
        // Effacer le cookie si utilisé
        res.clearCookie('token');
        
        res.status(200).json({ message: 'Déconnexion réussie' });
    } catch (err) {
        console.error('Erreur lors de la déconnexion:', err.message);
        res.status(500).json({ message: 'Une erreur est survenue lors de la tentative de déconnexion', error: err.message });
    } finally {
        connection.release();
    }
});

// Middleware pour vérifier le token et la session active avec améliorations de sécurité
const authenticateToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    
    if (!token) {
        return res.status(401).json({ message: 'Token d\'authentification requis' });
    }

    const connection = await pool.getConnection();
    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY, { algorithms: ['HS256'] });
        
        // Vérifier l'existence de la session active
        const [activeSession] = await connection.execute(
            'SELECT * FROM active_sessions WHERE user_id = ? AND token = ?',
            [decoded.id, token]
        );
        
        if (activeSession.length === 0) {
            return res.status(403).json({ message: 'Session expirée ou invalide' });
        }
        
        // Vérifier l'adresse IP et l'agent utilisateur (optionnel)
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent') || '';
        
        if (process.env.NODE_ENV === 'production' && 
            (activeSession[0].ip_address !== ipAddress || activeSession[0].user_agent !== userAgent)) {
            // Supprimer la session suspecte
            await connection.execute(
                'DELETE FROM active_sessions WHERE user_id = ?',
                [decoded.id]
            );
            return res.status(403).json({ message: 'Activité suspecte détectée' });
        }
        
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Erreur d\'authentification:', err.message);
        
        if (err.name === 'TokenExpiredError') {
            // Supprimer la session expirée
            try {
                const decoded = jwt.decode(token);
                await connection.execute(
                    'DELETE FROM active_sessions WHERE user_id = ?',
                    [decoded.id]
                );
            } catch (cleanupErr) {
                console.error('Erreur lors du nettoyage de la session expirée:', cleanupErr.message);
            }
            return res.status(403).json({ message: 'Session expirée, veuillez vous reconnecter' });
        }
        
        res.status(403).json({ message: 'Token invalide ou expiré' });
    } finally {
        connection.release();
    }
};

module.exports = router;