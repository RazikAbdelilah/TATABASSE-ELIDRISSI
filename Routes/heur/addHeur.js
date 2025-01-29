const express = require('express');
const router = express.Router(); // لإنشاء كلمة مرور عشوائية
const { pool } = require('../../database');

// Endpoint لإضافة بيانات إلى جدول heurs
router.post('/addHeur', async (req, res) => {
    const connection = await pool.getConnection();
    try {
      // الحصول على البيانات من الطلب
      const { candidate_id, montant, heurs, Morningorevening, date } = req.body;
  
      // التحقق من وجود الحقول المطلوبة
      if (!candidate_id || !montant || !date) {
        return res.status(400).json({
          message: 'Missing required fields (candidate_id, montant, date)',
        });
      }
  
      // إدخال البيانات في الجدول heurs
      await connection.execute(
        `INSERT INTO heurs (candidate_id, montant, heurs, Morningorevening, date) 
         VALUES (?, ?, ?, ?, ?)`,
        [candidate_id, montant, heurs || null, Morningorevening || null, date]
      );
  
      res.status(200).json({ message: 'Heur record added successfully' });
    } catch (err) {
      console.error('Error while adding heur record:', err.message);
      res.status(500).json({ message: 'An error occurred', error: err.message });
    } finally {
      connection.release(); // إغلاق الاتصال دائمًا
    }
});

// تصدير الـ router
module.exports = router;
