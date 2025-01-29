const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// إضافة دفعة جديدة
router.post('/addavance', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { candidate_id, montant, date, number_duserie } = req.body;

    // التحقق من الحقول المطلوبة
    if (!candidate_id || !montant || !date || !number_duserie) {
      return res.status(400).json({ message: 'Missing required fields (candidate_id, montant, date, number_duserie)' });
    }

    // التحقق من أن montant هو رقم
    if (isNaN(montant) || parseFloat(montant) <= 0) {
      return res.status(400).json({ message: 'montant must be a positive number' });
    }

    // التحقق من صحة التاريخ
    if (!isValidDate(date)) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    // بدء معاملة (Transaction)
    await connection.beginTransaction();

    // الحصول على اسم المدرسة من جدول candidates
    const [candidate] = await connection.execute(
      `SELECT nome_school FROM candidates WHERE id = ?`,
      [candidate_id]
    );

    if (candidate.length === 0) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const nome_school = candidate[0].nome_school;

    // الحصول على السنة الحالية (آخر رقمين)
    const currentYear = new Date().getFullYear().toString().slice(-2);

    // الحصول على آخر رقم تسلسلي لهذه المدرسة في هذه السنة
    const [lastSerial] = await connection.execute(
      `SELECT MAX(CAST(SUBSTRING_INDEX(Numéro_desérie_pardéfaut, '/', 1) AS UNSIGNED)) AS last_serial 
       FROM avances 
       WHERE candidate_id IN (SELECT id FROM candidates WHERE nome_school = ?) 
       AND Numéro_desérie_pardéfaut LIKE ?`,
      [nome_school, `%/${currentYear}`]
    );

    // حساب الرقم التسلسلي الجديد
    const newSerial = (lastSerial[0].last_serial || 0) + 1;
    const Numéro_desérie_pardéfaut = `${newSerial}/${currentYear}`;

    // إضافة الدفعة مع الرقم التسلسلي و number_duserie
    const [result] = await connection.execute(
      `INSERT INTO avances (candidate_id, montant, date, number_duserie, Numéro_desérie_pardéfaut) 
       VALUES (?, ?, ?, ?, ?)`,
      [candidate_id, montant, date, number_duserie, Numéro_desérie_pardéfaut]
    );

    // تأكيد المعاملة
    await connection.commit();

    res.status(201).json({ 
      message: 'Avance added successfully', 
      id: result.insertId, 
      number_duserie,
      Numéro_desérie_pardéfaut 
    });
  } catch (err) {
    // التراجع عن المعاملة في حالة حدوث خطأ
    await connection.rollback();
    console.error('Error while adding avance:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    // إعادة الاتصال إلى المجمع
    connection.release();
  }
});

// دالة مساعدة للتحقق من صحة التاريخ
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/; // تنسيق YYYY-MM-DD
  return regex.test(dateString);
}

module.exports = router;