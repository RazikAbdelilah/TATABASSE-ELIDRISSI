const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// استرجاع بيانات financier_de_letablissement بناءً على candidate_id
router.get('/financier_de_letablissement/:candidate_id', async (req, res) => {
  const candidate_id = req.params.candidate_id;

  const connection = await pool.getConnection();

  try {
    // التحقق مما إذا كان candidate_id موجودًا في جدول candidates
    const [candidateExists] = await connection.execute(
      `SELECT id FROM candidates WHERE id = ?`,
      [candidate_id]
    );

    if (candidateExists.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Candidate not found',
        financier_de_letablissement: []
      });
    }

    // استرجاع البيانات من جدول financier_de_letablissement
    const [financierData] = await connection.execute(
      `SELECT * FROM financier_de_letablissement WHERE candidate_id = ?`,
      [candidate_id]
    );

    if (financierData.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No financier data found for this candidate',
        financier_de_letablissement: []
      });
    }

    // إعادة البيانات بالشكل المطلوب
    res.status(200).json({ 
      success: true,
      financier_de_letablissement: financierData
    });

  } catch (err) {
    console.error('Error retrieving data:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving data', 
      error: err.message,
      financier_de_letablissement: []
    });
  } finally {
    connection.release();
  }
});



module.exports = router;