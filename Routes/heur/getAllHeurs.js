const express = require('express');
const router = express.Router();
const { pool } = require('../../database');
const crypto = require('crypto');

require('dotenv').config();

// دالة فك التشفير
function decryptValue(encryptedValue, secretKey) {
  try {
    const algorithm = 'aes-256-cbc';
    const [ivHex, encrypted] = encryptedValue.split(':');
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('فك التشفير فشل:', error);
    return encryptedValue;
  }
}

// جلب بيانات heurs حسب candidate_id
router.get('/getHeursByCandidate/:candidate_id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { candidate_id } = req.params;

    // استعلام SQL مع JOIN لجدول candidates إذا كنت بحاجة لمعلومات إضافية
    const query = `
  SELECT h.*, c.nome_school
  FROM heurs h
  LEFT JOIN candidates c ON h.candidate_id = c.id
  WHERE h.candidate_id = ?
    `;

    const [rows] = await connection.execute(query, [candidate_id]);

    if (rows.length === 0) {
      return res.status(404).json({ 
        data: [{
          
        }],
        candidate_id: candidate_id
      });
    }

    // فك تشفير montant لكل سجل
    const decryptedRows = rows.map(row => ({
      ...row,
      montant: parseFloat(decryptValue(row.montant, process.env.SECRET_KEY)) || 0
    }));

    res.status(200).json({
      success: true,
      count: decryptedRows.length,
      data: decryptedRows
    });

  } catch (err) {
    console.error('خطأ في جلب البيانات:', err.message);
    res.status(500).json({ 
      success: false,
      message: 'حدث خطأ في الخادم',
      error: err.message 
    });
  } finally {
    connection.release();
  }
});

module.exports = router;