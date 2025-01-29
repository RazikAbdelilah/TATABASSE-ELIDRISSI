const express = require('express');
const router = express.Router(); // لإنشاء كلمة مرور عشوائية
const { pool } = require('../../database');

// Endpoint لجلب جميع البيانات من جدول heurs
router.get('/getAllHeurs', async (req, res) => {
    const connection = await pool.getConnection();
    try {
      // استعلام لجلب جميع البيانات من جدول heurs
      const [rows] = await connection.execute(`SELECT * FROM heurs`);
  
      // التحقق من وجود بيانات
      if (rows.length === 0) {
        return res.status(404).json({ message: 'No records found' });
      }
  
      res.status(200).json(rows);
    } catch (err) {
      console.error('Error while fetching all heur data:', err.message);
      res.status(500).json({ message: 'An error occurred', error: err.message });
    } finally {
      connection.release(); // إغلاق الاتصال دائمًا
    }
});

// تصدير الـ router
module.exports = router;
