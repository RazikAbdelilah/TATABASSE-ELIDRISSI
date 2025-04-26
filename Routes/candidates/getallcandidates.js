const express = require('express');
const router = express.Router();
const { pool } = require('../../database');
require('dotenv').config();

router.get('/getall', async (req, res) => {
  const { cin, limit, nome_school } = req.query;
  const connection = await pool.getConnection();
  
  try {
    let query = 'SELECT * FROM candidates';
    let queryParams = [];
    let whereAdded = false;

    // إضافة فلتر المدرسة إذا موجود
    if (nome_school) {
      query += ' WHERE nome_school = ?';
      queryParams.push(nome_school);
      whereAdded = true;
    }

    // إضافة فلتر CIN إذا موجود - تم التعديل هنا لاستخدام LIKE
    if (cin) {
      query += whereAdded ? ' AND cin LIKE ?' : ' WHERE cin LIKE ?';
      queryParams.push(`${cin}%`);
      whereAdded = true;
    }

    // تحديد الترتيب والحدود
    query += ' ORDER BY id DESC';

    if (limit === 'last') {
      query += ' LIMIT 1';
    } else if (!isNaN(limit)) {
      query += ' LIMIT ?';
      queryParams.push(parseInt(limit));
    } else if (limit !== 'all') {
      query += ' LIMIT 200'; // الحالة الافتراضية
    }

    // تنفيذ الاستعلام الأساسي
    const [candidates] = await connection.execute(query, queryParams);

    if (candidates.length === 0) {
      return res.status(404).json({ message: 'لا توجد بيانات متاحة' });
    }

    // الباقي من الكود يبقى كما هو...
    if (candidates.length > 0) {
      const placeholders = candidates.map(() => '?').join(',');
      const [financier] = await connection.execute(
        `SELECT * FROM financier_de_letablissement
         WHERE candidate_id IN (${placeholders})`,
        candidates.map(c => c.id)
      );

      const candidatesWithDetails = candidates.map(candidate => ({
        ...candidate,
        financier_de_letablissement: financier.filter(f => f.candidate_id === candidate.id), 
      }));

      if (req.app.io) {
        req.app.io.emit('candidatesRetrieved', {
          message: 'تم استرجاع البيانات بنجاح',
          data: candidatesWithDetails,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'تم استرجاع البيانات بنجاح',
        data: candidatesWithDetails,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'لا توجد بيانات مالية مرتبطة',
      data: candidates.map(c => ({...c, financier_de_letablissement: []})),
    });

  } catch (err) {
    console.error('حدث خطأ:', err);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: err.message
    });
  } finally {
    connection.release();
  }
});

module.exports = router;