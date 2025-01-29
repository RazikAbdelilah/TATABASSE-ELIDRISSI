const express = require('express');
const router = express.Router();  // تعريف الـ Router
const { pool } = require('../database');

// مسار لاسترجاع المترشحين الذين تم إضافتهم بتاريخ اليوم فقط
router.get('/drivers/school', async (req, res) => {
    const { schoolName } = req.query; // استلام اسم المدرسة من الـ query parameter

    if (!schoolName) {
        return res.status(400).json({ success: false, message: 'School name is required' });
    }

    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // تحويل التاريخ إلى تنسيق YYYY-MM-DD

    const connection = await pool.getConnection();

    try {
        // استعلام لاسترجاع السائقين من المدرسة المحددة اليوم
        const [drivers] = await connection.execute(`
            SELECT id, candidate_id, nome, prenom, monitor, cin, categorie_domandee, nome_school, date
            FROM List_of_drivers
            WHERE date = ? AND nome_school = ?
        `, [formattedDate, schoolName]);

        // إرسال البيانات إلى الواجهة الأمامية
        res.json({ success: true, data: drivers });
    } catch (err) {
        console.error('Error fetching drivers for school:', err.message);
        res.status(500).json({ success: false, message: 'Error fetching data' });
    } finally {
        connection.release();
    }
});


module.exports = router;  // تأكد من تصدير الـ Router
