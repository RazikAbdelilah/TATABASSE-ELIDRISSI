const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// جلب بيانات draveng حسب المرشح أو جميع البيانات
router.get('/detalldraveng', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { candidate_id } = req.query; // جلب candidate_id من الاستعلام

    let query = `SELECT d.*, c.nome_school 
                 FROM draveng d 
                 JOIN candidates c ON d.candidate_id = c.id`;
    let params = [];

    if (candidate_id) {
      query += ` WHERE d.candidate_id = ?`;
      params.push(candidate_id);
    }

    const [rows] = await connection.execute(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No draveng records found' });
    }

    res.status(200).json(rows);
  } catch (err) {
    console.error('Error while fetching draveng:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
