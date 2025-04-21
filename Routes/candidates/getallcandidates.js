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
  const connection = await pool.getConnection();
  try {
    // استعلام لجلب جميع البيانات من جدول candidates
    const [candidates] = await connection.execute(`
      SELECT * FROM candidates
    `);

    if (candidates.length === 0) {
      return res.status(404).json({ message: 'No candidates found' });
    }

   

    const [financier] = await connection.execute(`
      SELECT * FROM financier_de_letablissement
    `);
    // دمج البيانات مع candidates
    const candidatesWithDetails = candidates.map(candidate => {
      return {
        ...candidate,
        financier_de_letablissement: financier.filter(f => f.candidate_id === candidate.id), 
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