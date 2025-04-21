const express = require('express');
const router = express.Router();
const { pool } = require('../database');

const crypto = require('crypto');

require('dotenv').config(); // تحميل المتغيرات من .env

// دالة لتشفير القيمة باستخدام createCipheriv
function encryptValue(value, secretKey) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(secretKey, 'salt', 32); // مفتاح بطول 32 بايت
  const iv = crypto.randomBytes(16); // متجه ابتدائي (IV) عشوائي بطول 16 بايت
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`; // إرجاع IV والقيمة المشفرة معًا
}

// دالة لفك تشفير القيمة باستخدام createDecipheriv
function decryptValue(encryptedValue, secretKey) {
  const algorithm = 'aes-256-cbc';
  const [ivHex, encrypted] = encryptedValue.split(':'); // فصل IV والقيمة المشفرة
  const key = crypto.scryptSync(secretKey, 'salt', 32); // مفتاح بطول 32 بايت
  const iv = Buffer.from(ivHex, 'hex'); // تحويل IV من نص hex إلى Buffer
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

router.post('/addheure_nouveaux', async (req, res) => {
  const {
    montant,
    nom,
    prenom,
    cin,
    heurs,
    Morningorevening,
    responsable,
    monitor,
    cap,
    matricule,
    nome_school,
    date,
  } = req.body;

  try {
    // التحقق من وجود جميع البيانات المطلوبة
    if (!montant || !date) {
      return res.status(400).json({ message: 'Veuillez fournir les champs montant et date.' });
    }

    // تشفير montant
    const secretKey = process.env.SECRET_KEY; // يجب أن يكون هذا المفتاح سريًا وآمنًا
    const encryptedMontant = encryptValue(montant.toString(), secretKey);

    const query = `
      INSERT INTO heure_nouveaux (montant, nom, prenom, cin, heurs, Morningorevening, responsable, monitor, cap, matricule, nome_school, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // تنفيذ الإدخال
    const [result] = await pool.execute(query, [
      encryptedMontant, // استخدام القيمة المشفرة
      nom,
      prenom,
      cin,
      heurs,
      Morningorevening,
      responsable,
      monitor,
      cap,
      matricule,
      nome_school,
      date,
    ]);

    res.status(201).json({ message: 'Les données ont été ajoutées avec succès.', id: result.insertId });
  } catch (error) {
    console.error('Erreur lors de l\'insertion des données:', error);
    res.status(500).json({ message: 'Une erreur est survenue lors de l\'ajout des données.' });
  }
});

// جلب جميع البيانات
router.get('/getheure_nouveaux', async (req, res) => {
  try {
    const query = `SELECT * FROM heure_nouveaux`;
    const [rows] = await pool.execute(query);

    // فك تشفير montant لكل صف
    const decryptedRows = rows.map(row => {
      return {
        ...row,
        montant: decryptValue(row.montant, process.env.SECRET_KEY), // فك تشفير montant
      };
    });

    // إرجاع البيانات مع montant المفكوك
    res.status(200).json(decryptedRows || []);
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    res.status(500).json({ message: 'Une erreur est survenue lors de la récupération des données.' });
  }
});

// جلب البيانات حسب nome_school
router.get('/getheure_nouveauxshool', async (req, res) => {
  try {
    const { nome_school } = req.query;

    // التحقق مما إذا كان `nome_school` موجودًا
    if (!nome_school) {
      return res.status(400).json({ message: "Le paramètre 'nome_school' est requis." });
    }

    // استعلام SQL لاسترجاع البيانات حسب `nome_school`
    const query = `SELECT * FROM heure_nouveaux WHERE nome_school = ?`;
    const [rows] = await pool.execute(query, [nome_school]);

    // فك تشفير montant لكل صف
    const decryptedRows = rows.map(row => {
      return {
        ...row,
        montant: decryptValue(row.montant, process.env.SECRET_KEY), // فك تشفير montant
      };
    });

    // إرجاع البيانات مع montant المفكوك
    res.status(200).json(decryptedRows || []);
  } catch (error) {
    console.error("Erreur lors de la récupération des données:", error);
    res.status(500).json({ message: "Une erreur est survenue lors de la récupération des données." });
  }
});

module.exports = router;
