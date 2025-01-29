const express = require('express');
const router = express.Router();
const { pool } = require('../../database');

// جلب البيانات من جدول Conduire_la_voiture
router.get('/getConduire/:candidate_id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { candidate_id } = req.params; // نستخدم params بدلاً من query

        if (!candidate_id) {
            return res.status(400).json({ message: 'Missing candidate_id' });
        }

        const [rows] = await connection.execute('SELECT * FROM Conduire_la_voiture WHERE candidate_id = ?', [candidate_id]);

        if (rows.length > 0) {
            const carArray = JSON.parse(rows[0].Conduire_la_voiture); // تحويل JSON إلى مصفوفة
            const nombreDeTempsDeConduite = rows[0].Nombre_de_temps_de_conduite; // استرجاع الحقل الجديد
            res.status(200).json({ cars: carArray, Nombre_de_temps_de_conduite: nombreDeTempsDeConduite });
        } else {
            res.status(404).json({ message: 'No data found for this candidate' });
        }
    } catch (err) {
        console.error('Error retrieving data:', err.message);
        res.status(500).json({ message: 'An error occurred', error: err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
