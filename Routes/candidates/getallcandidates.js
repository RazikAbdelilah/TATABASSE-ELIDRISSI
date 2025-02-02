const express = require('express');
const router = express.Router();
const { pool } = require('../../database');

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

    // استعلامات لجلب البيانات المرتبطة من الجداول الأخرى
    const [avances] = await connection.execute(`
      SELECT * FROM avances
    `);

    const [financier] = await connection.execute(`
      SELECT * FROM financier_de_letablissement
    `);

    const [draveng] = await connection.execute(`
      SELECT * FROM draveng
    `);

    const [heurs] = await connection.execute(`
      SELECT * FROM heurs
    `);

    // دمج البيانات مع candidates
    const candidatesWithDetails = candidates.map(candidate => {
      return {
        ...candidate,
        avances: avances.filter(avance => avance.candidate_id === candidate.id),
        financier_de_letablissement: financier.filter(f => f.candidate_id === candidate.id),
        draveng: draveng.filter(d => d.candidate_id === candidate.id),
        heurs: heurs.filter(h => h.candidate_id === candidate.id),
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
      message: 'All candidates and related data retrieved successfully',
      data: candidatesWithDetails,
    });
  } catch (err) {
    console.error('Error while retrieving candidates and related data:', err.message);
    res.status(500).json({
      message: 'An error occurred',
      error: err.message,
    });
  } finally {
    connection.release();
  }
});

module.exports = router;