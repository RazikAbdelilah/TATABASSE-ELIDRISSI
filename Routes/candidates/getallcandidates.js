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

    // إضافة فلتر CIN إذا موجود
    if (cin) {
      query += whereAdded ? ' AND cin LIKE ?' : ' WHERE cin LIKE ?';
      queryParams.push(`${cin}%`);
      whereAdded = true;
    }

    // تحديد الترتيب
    query += ' ORDER BY id DESC';

    // معالجة LIMIT بشكل صحيح
    if (limit === 'last') {
      query += ' LIMIT 1';
    } else if (!isNaN(limit)) {
      const limitValue = parseInt(limit);
      query += ` LIMIT ${limitValue}`; // إضافة القيمة مباشرة لتجنب مشكلة المعلمات
    } else if (limit !== 'all') {
      query += ' LIMIT 200'; // الحالة الافتراضية
    }

    // تنفيذ الاستعلام الأساسي
    const [candidates] = await connection.execute(query, queryParams);

    if (candidates.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'لا توجد بيانات متاحة' 
      });
    }

    // جلب البيانات المالية للمرشحين
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

      // إرسال إشعار عبر Socket.io إذا كان متاحاً
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

    // في حالة عدم وجود بيانات مالية
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
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;