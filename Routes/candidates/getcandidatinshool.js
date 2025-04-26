const express = require('express');
const router = express.Router();
const { pool } = require('../../database');
require('dotenv').config();

router.get('/getall', async (req, res) => {
  const { nome_school, cin, limit } = req.query;
  
  if (!nome_school) {
    return res.status(400).json({ message: 'nome_school is required' });
  }

  const connection = await pool.getConnection();
  
  try {
    let baseQuery = 'SELECT * FROM candidates WHERE nome_school = ?';
    let queryParams = [nome_school];
    
    if (cin) {
      baseQuery += ' AND cin LIKE ?'; // تغيير من = إلى LIKE للبحث الجزئي
      queryParams.push(`${cin}%`); // إضافة % للبحث عن الأرقام التي تبدأ بالقيمة المدخلة
    } 
    else if (!limit) {
      baseQuery += ' ORDER BY id DESC LIMIT 200';
    }
    else if (limit === 'last') {
      baseQuery += ' ORDER BY id DESC LIMIT 1';
    }
    else if (!isNaN(limit)) {
      baseQuery += ' ORDER BY id DESC LIMIT ?';
      queryParams.push(parseInt(limit));
    }
    else if (limit === 'all') {
      baseQuery += ' ORDER BY id DESC';
    }

    const [candidates] = await connection.execute(baseQuery, queryParams);

    if (candidates.length === 0) {
      return res.status(404).json({ message: 'No candidates found' });
    }

    // الحل المعدل لاستعلام financier
    const placeholders = candidates.map(() => '?').join(',');
    const [financier] = await connection.execute(
      `SELECT * FROM financier_de_letablissement WHERE candidate_id IN (${placeholders})`,
      candidates.map(c => c.id)
    );

    const candidatesWithDetails = candidates.map(candidate => ({
      ...candidate,
      financier_de_letablissement: financier.filter(f => f.candidate_id === candidate.id), 
    }));

    if (req.app.io) {
      req.app.io.emit('candidatesRetrieved', {
        message: 'Data retrieved successfully',
        data: candidatesWithDetails,
      });
    }

    res.status(200).json({
      message: 'تم استرجاع البيانات بنجاح',
      data: candidatesWithDetails,
    });
  } catch (err) {
    console.error('خطأ في استرجاع البيانات:', err.message);
    res.status(500).json({
      message: 'حدث خطأ',
      error: err.message,
    });
  } finally {
    connection.release();
  }
});

module.exports = router;