const express = require('express');
const router = express.Router();
const { pool } = require('../../database');

// جلب البيانات من جدول jour_ecole
router.get('/getJourEcole/:candidate_id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { candidate_id } = req.params;

        if (!candidate_id) {
            return res.status(400).json({ message: 'Missing candidate_id' });
        }

        // استخدام اسم الجدول الجديد jour_ecole
        const [rows] = await connection.execute(
            'SELECT * FROM jour_ecole WHERE candidate_id = ?', 
            [candidate_id]
        );

        if (rows.length > 0) {
            const result = {
                jour_ecole: rows.map(row => ({
                    id: row.id,
                    candidate_id: row.candidate_id,
                    jour_ecole: JSON.parse(row.jour_ecole) // تحويل JSON إلى مصفوفة
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
                error: `Table 'jour_ecole' doesn't exist`,
                solution: 'Please check your database migration scripts',
                detail: 'MySQL table names are case-sensitive on Linux servers'
            });
        } else if (err instanceof SyntaxError) {
            res.status(500).json({ 
                message: 'Data format error',
                error: 'Failed to parse jour_ecole data',
                detail: 'The jour_ecole field should contain valid JSON'
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