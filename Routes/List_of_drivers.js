const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// مسار لاسترجاع جميع السائقين الذين تم إضافتهم بتاريخ اليوم
router.get('/drivers', async (req, res) => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // تحويل التاريخ إلى تنسيق YYYY-MM-DD

    const connection = await pool.getConnection();

    try {
        // استعلام لاسترجاع جميع السائقين من الجدول بغض النظر عن المدرسة
        const [drivers] = await connection.execute(`
            SELECT id, candidate_id, nome, prenom, monitor, cin, categorie_domandee, nome_school, date
            FROM List_of_drivers
            WHERE date = ?
        `, [formattedDate]);

        // إرسال البيانات إلى الواجهة الأمامية
        res.json({ success: true, data: drivers });
    } catch (err) {
        console.error('Error fetching drivers:', err.message);
        res.status(500).json({ success: false, message: 'Error fetching data' });
    } finally {
        connection.release();
    }
});

module.exports = router;
