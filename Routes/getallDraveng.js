const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// جلب بيانات draveng حسب candidate_id من مسار الرابط
router.get('/detalldraveng/:candidate_id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { candidate_id } = req.params; // جلب candidate_id من مسار الرابط

    const query = `SELECT d.*, c.nome_school 
                 FROM draveng d 
                 JOIN candidates c ON d.candidate_id = c.id
                 WHERE d.candidate_id = ?`;
    
    const [rows] = await connection.execute(query, [candidate_id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No draveng records found for this candidate' });
    }

    // تحويل النتيجة إلى الهيكل المطلوب
    const result = {
      draveng: rows.map(row => ({
        id: row.id,
        candidate_id: row.candidate_id,
        Morningorevening: row.Morningorevening,
        commonter: row.commonter,
        responsable: row.responsable,
        state_drave: row.state_drave,
        change_state: row.change_state,
        date: row.date
      }))
    };

    res.status(200).json(result);
  } catch (err) {
    console.error('Error while fetching draveng:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;