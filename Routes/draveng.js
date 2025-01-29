const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// إضافة دفعة جديدة في draveng
router.post('/adddrave', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { candidate_id, Morningorevening, state_drave, date, change_state, commonter, responsable } = req.body;

    // الحقول المطلوبة
    const requiredFields = ['candidate_id', 'Morningorevening', 'state_drave', 'date', 'change_state', 'commonter', 'responsable'];

    // التحقق من وجود جميع الحقول المطلوبة
    const missingFields = requiredFields.filter(field => req.body[field] === undefined);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // تنفيذ الاستعلام لإدراج السجل في الجدول
    const [result] = await connection.execute(
      `INSERT INTO draveng (candidate_id, Morningorevening, state_drave, change_state, commonter, responsable, date) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [candidate_id, Morningorevening, state_drave, change_state, commonter, responsable, date]
    );

    res.status(201).json({ message: 'Drave added successfully', id: result.insertId });
  } catch (err) {
    console.error('Error while adding drave:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    connection.release(); // إغلاق الاتصال دائمًا
  }
});


router.put('/updatedrave', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { candidate_id, change_state, commonter, responsable } = req.body;

    // التحقق من وجود الحقول المطلوبة
    if (!candidate_id || !change_state || !commonter || !responsable) {
      return res.status(400).json({
        message: 'Missing required fields (candidate_id, change_state, commonter, responsable)'
      });
    }

    // التحقق إذا كان المسؤول (responsable) قد قام بالفعل بتحديث نفس candidate_id
    const [existingRecord] = await connection.execute(
      `SELECT COUNT(*) AS count FROM draveng 
       WHERE candidate_id = ? AND responsable = ?`,
      [candidate_id, responsable]
    );

    // إذا كان المسؤول قد قام بالتعديل مسبقاً
    if (existingRecord[0].count > 0) {
      return res.status(403).json({
        message: `Responsable '${responsable}' has already modified this candidate (ID: ${candidate_id}).`
      });
    }

    // الحصول على آخر سجل تم إضافته لـ candidate_id المحدد
    const [latestRecord] = await connection.execute(
      `SELECT id FROM draveng 
       WHERE candidate_id = ?
       ORDER BY id DESC LIMIT 1`,
      [candidate_id]
    );

    if (latestRecord.length === 0) {
      return res.status(404).json({ message: 'No records found for the specified candidate_id' });
    }

    const lastId = latestRecord[0].id; // آخر معرف تم إضافته لـ candidate_id

    // تحديث الحقول change_state, commonter, وresponsable
    await connection.execute(
      `UPDATE draveng 
       SET change_state = ?, commonter = ?, responsable = ?
       WHERE id = ?`,
      [change_state, commonter, responsable, lastId]
    );

    res.status(200).json({
      message: 'Last drave record updated successfully',
      id: lastId,
      updatedFields: { change_state, commonter, responsable }
    });
  } catch (err) {
    console.error('Error while updating drave:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    connection.release(); // إغلاق الاتصال دائمًا
  }
});



module.exports = router;
