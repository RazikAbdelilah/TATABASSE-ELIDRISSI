const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// دالة مساعدة لتحديث حالة المرشح بناءً على شروط draveng
async function updateDraveState(connection, candidate_id) {
  try {
      // التحقق من آخر قيمة لـ change_state
      const [changeStateResults] = await connection.execute(`
          SELECT change_state 
          FROM draveng 
          WHERE candidate_id = ? 
          ORDER BY date DESC 
          LIMIT 1
      `, [candidate_id]);

      let newState = 'Bon'; // الحالة الافتراضية

      // إذا كانت القيمة الأخيرة لـ change_state = true
      if (changeStateResults.length > 0 && changeStateResults[0].change_state === 1) {
          newState = 'Bon';
      } else {
          // جلب آخر 5 قيم لـ state_drave
          const [draveResults] = await connection.execute(`
              SELECT state_drave 
              FROM draveng 
              WHERE candidate_id = ? 
              ORDER BY date DESC 
              LIMIT 5
          `, [candidate_id]);

          // عد القيم false في آخر 5 سجلات
          const lastFiveFalseCount = draveResults.filter(d => d.state_drave === 0).length;
          const lastFiveTrueCount = draveResults.filter(d => d.state_drave === 1).length;

          // جلب كل سجلات state_drave
          const [allDraveResults] = await connection.execute(`
              SELECT state_drave 
              FROM draveng 
              WHERE candidate_id = ?
          `, [candidate_id]);

          // عد كل القيم false
          const totalFalseCount = allDraveResults.filter(d => d.state_drave === 0).length;

          // تطبيق شروط التحديث
          if (lastFiveFalseCount === 5 || totalFalseCount >= 6) {
              newState = 'Pasbon';
          } else if (lastFiveTrueCount === 5) {
              newState = 'Bon';
          }
      }

      // تحديث الحالة في جدول candidates
      await connection.execute(`
          UPDATE candidates 
          SET state_drave = ? 
          WHERE id = ?
      `, [newState, candidate_id]);

      console.log(`Updated state_drave for candidate ${candidate_id} to: ${newState}`);
  } catch (err) {
      console.error(`Error updating state for candidate ${candidate_id}:`, err.message);
  }
}

// إضافة دفعة جديدة في draveng مع تحديث الحالة مباشرة
router.post('/adddrave', async (req, res) => {
  const connection = await pool.getConnection();
  try {
      const { candidate_id, Morningorevening, state_drave, date, change_state, commonter, responsable } = req.body;

      // الحقول المطلوبة
      const requiredFields = ['candidate_id', 'Morningorevening', 'state_drave', 'date', 'change_state', 'commonter', 'responsable'];
      const missingFields = requiredFields.filter(field => req.body[field] === undefined);

      if (missingFields.length > 0) {
          return res.status(400).json({
              message: `Missing required fields: ${missingFields.join(', ')}`,
          });
      }

      // التحقق من عدم وجود سجل لنفس التاريخ
      const [existingRecord] = await connection.execute(
          `SELECT 1 FROM draveng WHERE candidate_id = ? AND date = ? LIMIT 1`,
          [candidate_id, date]
      );

      if (existingRecord.length > 7) {
          return res.status(409).json({
              message: `Record already exists for candidate ${candidate_id} on date ${date}`,
          });
      }

      // إدراج السجل الجديد
      const [result] = await connection.execute(
          `INSERT INTO draveng 
           (candidate_id, Morningorevening, state_drave, change_state, commonter, responsable, date) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [candidate_id, Morningorevening, state_drave, change_state, commonter, responsable, date]
      );

      // تحديث حالة المرشح مباشرة بعد الإدراج
      await updateDraveState(connection, candidate_id);

      res.status(201).json({ 
          success: true,
          message: 'Drave added successfully', 
          id: result.insertId 
      });

  } catch (err) {
      console.error('Error adding drave:', err.message);
      res.status(500).json({ 
          success: false,
          message: 'Error adding drave', 
          error: err.message 
      });
  } finally {
      connection.release();
  }
});


router.post('/adddraveall', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { candidate_id, Morningorevening, state_drave, date, change_state, commonter, responsable } = req.body;

    // الحقول المطلوبة
    const requiredFields = ['candidate_id', 'Morningorevening', 'state_drave', 'date', 'change_state', 'commonter', 'responsable'];

    // التحقق من وجود جميع الحقول المطلوبة
    const missingFields = requiredFields.filter(field => req.body[field] === undefined);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(', ')}`,
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

// ============

router.put('/updateLastDrave', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { candidate_id } = req.body;

    // التحقق من وجود الحقول المطلوبة
    if (!candidate_id) {
      return res.status(400).json({
        message: 'Missing required field: candidate_id',
      });
    }

    await connection.beginTransaction();

    // 1. تحديث الجدول الرئيسي candidates أولاً
    const [updateCandidateResult] = await connection.execute(
      `UPDATE candidates 
       SET state_drave = 'Bon' 
       WHERE id = ?`,
      [candidate_id]
    );

    if (updateCandidateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: `Candidate with id ${candidate_id} not found`,
      });
    }

    // 2. تحديث آخر سجل في draveng
    const [updateResult] = await connection.execute(
      `UPDATE draveng 
       SET change_state = true 
       WHERE candidate_id = ? 
       ORDER BY id DESC 
       LIMIT 1`,
      [candidate_id]
    );

    if (updateResult.affectedRows === 0) {
      // يمكن اعتبار هذا تحذيراً وليس خطأً، حيث قد لا يكون هناك سجلات في draveng
      console.warn(`No records found in draveng for candidate_id ${candidate_id}`);
      // لا نعيد العملية هنا لأن تحديث الجدول الرئيسي تم بنجاح
    }

    await connection.commit();

    res.status(200).json({
      message: `Candidate state_drave updated to 'Bon' and last draveng record updated`,
      candidate_id: candidate_id,
    });

  } catch (err) {
    await connection.rollback();
    console.error('Error in updateLastDrave:', err);
    res.status(500).json({ 
      message: 'Internal server error',
      error: err.message 
    });
  } finally {
    connection.release();
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

    // بدء المعاملة
    await connection.beginTransaction();

    // التحقق من وجود أي سجل يحتوي على change_state = true لنفس candidate_id
    const [trueStateRecords] = await connection.execute(
      `SELECT responsable FROM draveng 
       WHERE candidate_id = ? AND change_state = true`,
      [candidate_id]
    );

    // إذا كان هناك سجل واحد على الأقل يحتوي على change_state = true
    if (trueStateRecords.length > 0) {
      // التحقق إذا كان responsable الذي يحاول التعديل هو نفسه الذي قام بتغيير change_state إلى true
      const responsableChangedToTrue = trueStateRecords.some(
        (record) => record.responsable === responsable
      );

      // إذا كان هو نفسه، يتم رفض التعديل
      if (responsableChangedToTrue) {
        await connection.rollback();
        return res.status(403).json({
          message: `Responsable '${responsable}' L'enregistrement ne peut pas être modifié`
        });
      }
    }

    // الحصول على آخر سجل تم إضافته لـ candidate_id المحدد
    const [latestRecord] = await connection.execute(
      `SELECT id FROM draveng 
       WHERE candidate_id = ?
       ORDER BY id DESC LIMIT 1`,
      [candidate_id]
    );

    if (latestRecord.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        message: 'No records found for the specified candidate_id' 
      });
    }

    const lastId = latestRecord[0].id; // آخر معرف تم إضافته لـ candidate_id

    // تحديث الحقول change_state, commonter, وresponsable في جدول draveng
    const [updateResult] = await connection.execute(
      `UPDATE draveng 
       SET change_state = ?, commonter = ?, responsable = ?
       WHERE id = ?`,
      [change_state, commonter, responsable, lastId]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(500).json({
        message: 'Failed to update draveng record'
      });
    }

    // تحديث الجدول الرئيسي candidates إذا كانت change_state = true
    if (change_state === true) {
      const [updateCandidateResult] = await connection.execute(
        `UPDATE candidates 
         SET state_drave = 'Bon' 
         WHERE id = ?`,
        [candidate_id]
      );

      if (updateCandidateResult.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({
          message: `Candidate with id ${candidate_id} not found`
        });
      }
    }

    // تأكيد المعاملة إذا نجح كل شيء
    await connection.commit();

    res.status(200).json({
      message: 'Last drave record updated successfully' + 
               (change_state ? ' and candidate state_drave set to "Bon"' : ''),
      id: lastId,
      updatedFields: { change_state, commonter, responsable }
    });

  } catch (err) {
    await connection.rollback();
    console.error('Error while updating drave:', err.message);
    res.status(500).json({ 
      message: 'An error occurred', 
      error: err.message 
    });
  } finally {
    connection.release(); // إغلاق الاتصال دائمًا
  }
});



module.exports = router;
