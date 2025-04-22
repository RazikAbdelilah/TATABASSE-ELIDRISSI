const express = require('express');
const router = express.Router();
const { pool } = require('../../database');


require('dotenv').config(); // تحميل المتغيرات من .env



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