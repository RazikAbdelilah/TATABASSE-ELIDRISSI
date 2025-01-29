const express = require('express');
const router = express.Router();
const { pool } = require('../../database');

// Endpoint لاسترجاع جميع البيانات من جدول reservations
router.get('/getAllReservations', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // استعلام لجلب جميع البيانات من جدول reservations فقط
        const [rows] = await connection.execute('SELECT * FROM reservations');

        // التحقق من وجود بيانات
        if (rows.length === 0) {
            return res.status(404).json({ message: 'No records found' });
        }

        // إرسال البيانات المسترجعة
        res.status(200).json(rows);
    } catch (err) {
        console.error('Error while fetching reservations data:', err.message);
        res.status(500).json({ message: 'An error occurred', error: err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
