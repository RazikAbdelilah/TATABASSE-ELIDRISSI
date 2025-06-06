const express = require('express');
const router = express.Router();
const { pool } = require('../../database');

// جلب البيانات من جدول conduire_la_voiture
router.get('/getConduire/:candidate_id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { candidate_id } = req.params;

        if (!candidate_id) {
            return res.status(400).json({ message: 'Missing candidate_id' });
        }

        // استخدام اسم الجدول بحروف صغيرة consistently
        const [rows] = await connection.execute(
            'SELECT * FROM conduire_la_voiture WHERE candidate_id = ?', 
            [candidate_id]
        );

        if (rows.length > 0) {
            const result = {
                conduire_la_voiture: rows.map(row => ({
                    id: row.id,
                    candidate_id: row.candidate_id,
                    Conduire_la_voiture: JSON.parse(row.Conduire_la_voiture),
                    Nombre_de_temps_de_conduite: row.Nombre_de_temps_de_conduite
                }))
            };
            res.status(200).json(result);
        } else {
            res.status(404).json({ 
                message: 'No data found for this candidate',
                candidate_id: candidate_id
            });
        }
    } catch (err) {
        console.error('Error retrieving data:', err);
        
        // تحسين رسائل الخطأ
        if (err.code === 'ER_NO_SUCH_TABLE') {
            res.status(500).json({ 
                message: 'Database table error',
                error: `Table 'conduire_la_voiture' doesn't exist`,
                solution: 'Please check your database migration scripts',
                detail: 'MySQL table names are case-sensitive on Linux servers'
            });
        } else {
            res.status(500).json({ 
                message: 'An error occurred',
                error: err.message,
                code: err.code,
                stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
            });
        }
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;