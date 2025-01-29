const express = require('express');
const router = express.Router(); // لإنشاء كلمة مرور عشوائية
const { pool } = require('../../database');

// Endpoint لجلب البيانات باستخدام candidate_id
router.get('/getHeursByCandidate/:candidate_id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { candidate_id } = req.params;
  
      // التحقق من وجود candidate_id
      if (!candidate_id) {
        return res.status(400).json({ message: 'Missing candidate_id' });
      }
  
      // استعلام لجلب البيانات باستخدام candidate_id
      const [rows] = await connection.execute(
        `SELECT * FROM heurs WHERE candidate_id = ?`,
        [candidate_id]
      );
  
      // التحقق من وجود بيانات
      if (rows.length === 0) {
        return res.status(404).json({ message: 'No records found for this candidate_id' });
      }
  
      res.status(200).json(rows);
    } catch (err) {
      console.error('Error while fetching heur data by candidate_id:', err.message);
      res.status(500).json({ message: 'An error occurred', error: err.message });
    } finally {
      connection.release();
    }
});

// تصدير الـ router
module.exports = router;
