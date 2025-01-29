const express = require('express');
const router = express.Router();
const { pool } = require('../../database');

// Endpoint لإضافة حجز جديد مع تاريخ كامل
router.post('/addReservation', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // الحصول على البيانات من الطلب
        const { candidate_id, month, school_nomschool, nome, prenom, cin } = req.body;

        // التحقق من وجود الحقول المطلوبة
        if (!candidate_id || !month || !school_nomschool || !nome || !prenom || !cin) {
            return res.status(400).json({
                message: 'Missing required fields (candidate_id, month, school_nomschool, nome, prenom, cin)',
            });
        }

        // الحصول على السنة الحالية
        const currentYear = new Date().getFullYear();

        // تحديد اليوم الأول من الشهر المدخل
        const date = new Date(currentYear, month - 1, 1); // الشهر يبدأ من 0 في JavaScript، لذا نخصم 1 من الشهر

        // إدخال البيانات في جدول reservations مع الحالة 'provisoire' بشكل افتراضي
        await connection.execute(
            `INSERT INTO reservations (candidate_id, month, state, school_nomschool, nome, prenom, cin) 
             VALUES (?, ?, 'provisoire', ?, ?, ?, ?)`,
            [candidate_id, date, school_nomschool, nome, prenom, cin]
        );

        res.status(200).json({ message: 'Reservation record added successfully' });
    } catch (err) {
        console.error('Error while adding reservation record:', err.message);
        res.status(500).json({ message: 'An error occurred', error: err.message });
    } finally {
        connection.release(); // إغلاق الاتصال دائمًا
    }
});

module.exports = router;
