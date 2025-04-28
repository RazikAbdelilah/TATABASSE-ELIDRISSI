const express = require('express');
const router = express.Router();
const { pool } = require('../database');

router.post('/messages', async (req, res) => {
    const { candidate_id, note = false, message = null } = req.body;
  
    if (!candidate_id) {
      return res.status(400).json({ error: 'Candidate ID is required' });
    }
  
    try {
      // تحقق إذا كانت هناك رسالة سابقة لهذا المرشح
      const [existing] = await pool.execute(
        'SELECT id FROM messags WHERE candidate_id = ?',
        [candidate_id]
      );
  
      let query, params;
      if (existing.length > 0) {
        // تحديث بدون updated_at
        query = `UPDATE messags 
                 SET note = ?, message = ? 
                 WHERE candidate_id = ?`;
        params = [note, message, candidate_id];
      } else {
        // إضافة جديدة
        query = `INSERT INTO messags (candidate_id, note, message) 
                 VALUES (?, ?, ?)`;
        params = [candidate_id, note, message];
      }
  
      const [result] = await pool.execute(query, params);
  
      return res.status(200).json({
        success: true,
        message: existing.length > 0 ? 'Message updated successfully' : 'Message created successfully',
        candidate_id: candidate_id
      });
  
    } catch (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database operation failed',
        details: error.message
      });
    }
  });
  

// جلب رسائل مرشح معين
router.get('/messages/:candidate_id', async (req, res) => {
  try {
    const { candidate_id } = req.params;

    if (!candidate_id || isNaN(candidate_id)) {
      return res.status(400).json({ error: 'Invalid candidate ID' });
    }

    const [messages] = await pool.execute(
      'SELECT * FROM messags WHERE candidate_id = ?',
      [candidate_id]
    );

    res.status(200).json({
      count: messages.length,
      messages: messages
    });

  } catch (error) {
    console.error('Error fetching candidate messages:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;
