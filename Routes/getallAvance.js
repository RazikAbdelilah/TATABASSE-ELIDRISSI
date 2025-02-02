const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// جلب الدفعات حسب المرشح أو جميع الدفعات
router.get('/getallAvances', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { candidate_id } = req.query; // جلب candidate_id من الاستعلام

    let query = `SELECT a.*, c.nome_school 
                 FROM avances a 
                 JOIN candidates c ON a.candidate_id = c.id`;
    let params = [];

    if (candidate_id) {
      query += ` WHERE a.candidate_id = ?`;
      params.push(candidate_id);
    }

    const [rows] = await connection.execute(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No avances found' });
    }

    res.status(200).json(rows);
  } catch (err) {
    console.error('Error while fetching avances:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
