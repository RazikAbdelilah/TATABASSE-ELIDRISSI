const express = require('express');
const router = express.Router(); // لإنشاء كلمة مرور عشوائية
const { pool } = require('../../database');


// إضافة بيانات إلى جدول Conduire_la_voiture
router.post('/addConduire', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { candidate_id, Conduire_la_voiture, Nombre_de_temps_de_conduite } = req.body;

    if (!candidate_id || !Conduire_la_voiture) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // تحويل المصفوفة إلى JSON (إذا كانت المصفوفة)
    const carArrayJson = JSON.stringify(Conduire_la_voiture);

    // إذا لم يتم توفير قيمة لـ Nombre_de_temps_de_conduite، سيتم استخدام القيمة الافتراضية
    const timeToDrive = Nombre_de_temps_de_conduite || '20'; // افتراض 20 إذا لم يتم تحديد قيمة

    // إدخال البيانات إلى الجدول
    await connection.execute(`
      INSERT INTO Conduire_la_voiture (candidate_id, Conduire_la_voiture, Nombre_de_temps_de_conduite)
      VALUES (?, ?, ?)
    `, [candidate_id, carArrayJson, timeToDrive]);

    res.status(201).json({ message: 'Data inserted successfully' });
  } catch (err) {
    console.error('Error inserting data:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    connection.release();
  }
});



module.exports = router;