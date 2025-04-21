const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const crypto = require('crypto');

require('dotenv').config(); // تحميل المتغيرات من .env

// دالة لفك تشفير القيمة
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
    console.error('Error decrypting value:', error);
    return encryptedValue; // إرجاع القيمة المشفرة في حالة حدوث خطأ
  }
}

// جلب الدفعات حسب المرشح
router.get('/getAvances/:candidate_id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { candidate_id } = req.params;

    const query = `SELECT a.*, c.nome_school 
                   FROM avances a 
                   JOIN candidates c ON a.candidate_id = c.id
                   WHERE a.candidate_id = ?`;
    
    const [rows] = await connection.execute(query, [candidate_id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No avances found for this candidate' });
    }

    // فك تشفير montant لكل صف
    const decryptedRows = rows.map(row => {
      return {
        ...row,
        montant: decryptValue(row.montant, process.env.SECRET_KEY)
      };
    });

    res.status(200).json(decryptedRows);
  } catch (err) {
    console.error('Error while fetching avances:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;