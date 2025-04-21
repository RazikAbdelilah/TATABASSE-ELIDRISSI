const express = require('express');
const router = express.Router();
const { pool } = require('../../database');
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

// استخدام middleware للتحقق من التوكن قبل الوصول إلى الـ route
router.get('/getall', async (req, res) => {
  const { nome_school } = req.query; // جلب nome_school من query parameters

  if (!nome_school) {
    return res.status(400).json({ message: 'nome_school is required' });
  }

  const connection = await pool.getConnection();
  try {
    // استعلام لجلب جميع البيانات من جدول candidates بناءً على nome_school
    const [candidates] = await connection.execute(
      `SELECT * FROM candidates WHERE nome_school = ?`,
      [nome_school]
    );

    if (candidates.length === 0) {
      return res.status(404).json({ message: 'No candidates found for the specified nome_school' });
    }

    // استعلامات لجلب البيانات المرتبطة من الجداول الأخرى بناءً على nome_school
    const [avances] = await connection.execute(
      `SELECT * FROM avances WHERE candidate_id IN (SELECT id FROM candidates WHERE nome_school = ?)`,
      [nome_school]
    );

    const [financier] = await connection.execute(
      `SELECT * FROM financier_de_letablissement WHERE candidate_id IN (SELECT id FROM candidates WHERE nome_school = ?)`,
      [nome_school]
    );

    const [draveng] = await connection.execute(
      `SELECT * FROM draveng WHERE candidate_id IN (SELECT id FROM candidates WHERE nome_school = ?)`,
      [nome_school]
    );

    const [heurs] = await connection.execute(
      `SELECT * FROM heurs WHERE candidate_id IN (SELECT id FROM candidates WHERE nome_school = ?)`,
      [nome_school]
    );

    const [conduire_la_voiture] = await connection.execute(
      `SELECT * FROM conduire_la_voiture WHERE candidate_id IN (SELECT id FROM candidates WHERE nome_school = ?)`,
      [nome_school]
    );

    // فك تشفير montant في جدول avances
    const decryptedAvances = avances.map(avance => {
      return {
        ...avance,
        montant: decryptValue(avance.montant, process.env.SECRET_KEY), // فك تشفير montant
      };
    });

    // فك تشفير montant في جدول heurs
    const decryptedHeurs = heurs.map(heur => {
      return {
        ...heur,
        montant: decryptValue(heur.montant, process.env.SECRET_KEY), // فك تشفير montant
      };
    });

    // دمج البيانات مع candidates
    const candidatesWithDetails = candidates.map(candidate => {
      return {
        ...candidate,
        avances: decryptedAvances.filter(avance => avance.candidate_id === candidate.id),
        financier_de_letablissement: financier.filter(f => f.candidate_id === candidate.id),
        draveng: draveng.filter(d => d.candidate_id === candidate.id),
        heurs: decryptedHeurs.filter(h => h.candidate_id === candidate.id),
        conduire_la_voiture: conduire_la_voiture.filter(c => c.candidate_id === candidate.id),
      };
    });

    // إرسال إشعار عبر WebSocket بعد جلب البيانات
    if (req.app.io) {
      req.app.io.emit('candidatesRetrieved', {
        message: 'Candidates and related data retrieved successfully',
        data: candidatesWithDetails,
      });
    }

    res.status(200).json({
      message: 'Tous les candidats et les données connexes ont été récupérés avec succès',
      data: candidatesWithDetails,
    });
  } catch (err) {
    console.error('Erreur lors de la récupération des candidats et des données connexes :', err.message);
    res.status(500).json({
      message: 'An error occurred',
      error: err.message,
    });
  } finally {
    connection.release();
  }
});

module.exports = router;