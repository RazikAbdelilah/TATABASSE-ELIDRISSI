const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const crypto = require('crypto');

require('dotenv').config(); // تحميل المتغيرات من .env

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

router.get('/getheure_nouveauxss', async (req, res) => {
  try {
    const { nome_school } = req.query;

    // التحقق مما إذا كان `nome_school` موجودًا
    if (!nome_school) {
      return res.status(400).json({ message: "Le paramètre 'nome_school' est requis." });
    }

    // استعلام SQL لاسترجاع البيانات حسب `nome_school`
    const query = `SELECT * FROM heure_nouveaux WHERE nome_school = ?`;
    const [rows] = await pool.execute(query, [nome_school]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Aucune donnée trouvée pour ce 'nome_school'." });
    }

    // فك تشفير montant لكل صف
    const decryptedRows = rows.map(row => {
      return {
        ...row,
        montant: decryptValue(row.montant, process.env.SECRET_KEY), // فك تشفير montant
      };
    });

    // إرجاع البيانات مع montant المفكوك
    res.status(200).json(decryptedRows);
  } catch (error) {
    console.error("Erreur lors de la récupération des données:", error);
    res.status(500).json({ message: "Une erreur est survenue lors de la récupération des données." });
  }
});

module.exports = router;
