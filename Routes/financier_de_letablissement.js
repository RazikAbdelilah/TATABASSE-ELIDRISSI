const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// دالة مساعدة لتحديث حالة المرشح
async function updateCandidateState(connection, candidate_id) {
    try {
        // جلب بيانات الاختبارات للمرشح
        const [financierData] = await connection.execute(`
            SELECT 
                apt_exam_theoriqe_1, apt_exam_theoriqe_2, inapt_exam_theoriqe_1, inapt_exam_theoriqe_2,
                apt_exam_pratiqe_1, apt_exam_pratiqe_2, inapt_exam_pratiqe_1, inapt_exam_pratiqe_2
            FROM financier_de_letablissement
            WHERE candidate_id = ?
        `, [candidate_id]);

        if (financierData.length === 0) return;

        const {
            apt_exam_theoriqe_1, apt_exam_theoriqe_2, inapt_exam_theoriqe_1, inapt_exam_theoriqe_2,
            apt_exam_pratiqe_1, apt_exam_pratiqe_2, inapt_exam_pratiqe_1, inapt_exam_pratiqe_2
        } = financierData[0];

        let newState = null;

        // تحديد الحالة بناءً على نتائج الاختبارات
        if (apt_exam_pratiqe_1 || apt_exam_pratiqe_2 || inapt_exam_pratiqe_1 || inapt_exam_pratiqe_2) {
            newState = 'pratique';
        } else if (apt_exam_theoriqe_1 || apt_exam_theoriqe_2 || inapt_exam_theoriqe_1 || inapt_exam_theoriqe_2) {
            newState = 'théorique';
        }

        // حذف السجلات من جدول reservations إذا تحقق الشرط
        if (apt_exam_theoriqe_1 || inapt_exam_theoriqe_1) {
            await connection.execute(
                'DELETE FROM reservations WHERE candidate_id = ?',
                [candidate_id]
            );
            
        }

        if (inapt_exam_pratiqe_2 || apt_exam_pratiqe_1 || apt_exam_pratiqe_2) {
          await connection.execute(
              'DELETE FROM conduire_la_voiture WHERE candidate_id = ?',
              [candidate_id]
          );
          
      }

      if (inapt_exam_pratiqe_2 || apt_exam_pratiqe_1 || apt_exam_pratiqe_2) {
        await connection.execute(
            'DELETE FROM draveng WHERE candidate_id = ?',
            [candidate_id]
        );
        
    }

        // تحديث الحالة إذا لزم الأمر
        if (newState) {
            await connection.execute(
                'UPDATE candidates SET state = ? WHERE id = ?',
                [newState, candidate_id]
            );
            console.log(`Updated state for candidate ${candidate_id} to ${newState}`);
        }
    } catch (err) {
        console.error(`Error updating state for candidate ${candidate_id}:`, err.message);
    }
}

router.put('/financier_de_letablissement/:candidate_id', async (req, res) => {
  const candidate_id = req.params.candidate_id;

  // استقبال القيم من الطلب
  const {
    jour_pours_legaliser,
    exam_medical,
    frais_de_timbre,
    la_fin_de_la_formation,
    les_devoirs_finaancier_de_letablissement,
    exam_theoriqe_1,
    exam_theoriqe_2,
    exam_pratiqe_1,
    exam_pratiqe_2,
    examen_exceptionnel,
    inapt_exam_pratiqe_1,
    inapt_exam_pratiqe_2,
    apt_exam_pratiqe_1,
    apt_exam_pratiqe_2,
    apt_exam_theoriqe_1,
    apt_exam_theoriqe_2,
    inapt_exam_theoriqe_1,
    inapt_exam_theoriqe_2
  } = req.body;

  const connection = await pool.getConnection();

  try {
    // التحقق من وجود المرشح
    const [candidateExists] = await connection.execute(
      `SELECT id FROM candidates WHERE id = ?`,
      [candidate_id]
    );

    if (candidateExists.length === 0) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    // التحقق من وجود بيانات سابقة
    const [dataExists] = await connection.execute(
      `SELECT candidate_id FROM financier_de_letablissement WHERE candidate_id = ?`,
      [candidate_id]
    );

    if (dataExists.length > 0) {
      // تحديث البيانات الموجودة
      const updateFields = [];
      const updateValues = [];

      if (jour_pours_legaliser !== undefined) { updateFields.push("jour_pours_legaliser = ?"); updateValues.push(jour_pours_legaliser); }
      if (exam_medical !== undefined) { updateFields.push("exam_medical = ?"); updateValues.push(exam_medical); }
      if (frais_de_timbre !== undefined) { updateFields.push("frais_de_timbre = ?"); updateValues.push(frais_de_timbre); }
      if (la_fin_de_la_formation !== undefined) { updateFields.push("la_fin_de_la_formation = ?"); updateValues.push(la_fin_de_la_formation); }
      if (les_devoirs_finaancier_de_letablissement !== undefined) { updateFields.push("les_devoirs_finaancier_de_letablissement = ?"); updateValues.push(les_devoirs_finaancier_de_letablissement); }
      if (exam_theoriqe_1 !== undefined) { updateFields.push("exam_theoriqe_1 = ?"); updateValues.push(exam_theoriqe_1); }
      if (exam_theoriqe_2 !== undefined) { updateFields.push("exam_theoriqe_2 = ?"); updateValues.push(exam_theoriqe_2); }
      if (exam_pratiqe_1 !== undefined) { updateFields.push("exam_pratiqe_1 = ?"); updateValues.push(exam_pratiqe_1); }
      if (exam_pratiqe_2 !== undefined) { updateFields.push("exam_pratiqe_2 = ?"); updateValues.push(exam_pratiqe_2); }
      if (examen_exceptionnel !== undefined) { updateFields.push("examen_exceptionnel = ?"); updateValues.push(examen_exceptionnel); }
      if (inapt_exam_pratiqe_1 !== undefined) { updateFields.push("inapt_exam_pratiqe_1 = ?"); updateValues.push(inapt_exam_pratiqe_1); }
      if (inapt_exam_pratiqe_2 !== undefined) { updateFields.push("inapt_exam_pratiqe_2 = ?"); updateValues.push(inapt_exam_pratiqe_2); }
      if (apt_exam_pratiqe_1 !== undefined) { updateFields.push("apt_exam_pratiqe_1 = ?"); updateValues.push(apt_exam_pratiqe_1); }
      if (apt_exam_pratiqe_2 !== undefined) { updateFields.push("apt_exam_pratiqe_2 = ?"); updateValues.push(apt_exam_pratiqe_2); }
      if (apt_exam_theoriqe_1 !== undefined) { updateFields.push("apt_exam_theoriqe_1 = ?"); updateValues.push(apt_exam_theoriqe_1); }
      if (apt_exam_theoriqe_2 !== undefined) { updateFields.push("apt_exam_theoriqe_2 = ?"); updateValues.push(apt_exam_theoriqe_2); }
      if (inapt_exam_theoriqe_1 !== undefined) { updateFields.push("inapt_exam_theoriqe_1 = ?"); updateValues.push(inapt_exam_theoriqe_1); }
      if (inapt_exam_theoriqe_2 !== undefined) { updateFields.push("inapt_exam_theoriqe_2 = ?"); updateValues.push(inapt_exam_theoriqe_2); }

      if (updateFields.length === 0) {
        return res.status(400).json({ success: false, message: "No fields provided for update" });
      }

      const updateQuery = `UPDATE financier_de_letablissement SET ${updateFields.join(", ")} WHERE candidate_id = ?`;
      updateValues.push(candidate_id);

      await connection.execute(updateQuery, updateValues);

      // تحديث حالة المرشح بعد التعديل
      await updateCandidateState(connection, candidate_id);

      res.status(200).json({ success: true, message: 'Data updated successfully' });
    } else {
      // إدراج بيانات جديدة
      const insertQuery = `
        INSERT INTO financier_de_letablissement (
          candidate_id, jour_pours_legaliser, exam_medical, frais_de_timbre, la_fin_de_la_formation, 
          les_devoirs_finaancier_de_letablissement, exam_theoriqe_1, exam_theoriqe_2, 
          exam_pratiqe_1, exam_pratiqe_2, examen_exceptionnel, inapt_exam_pratiqe_1, 
          inapt_exam_pratiqe_2, apt_exam_pratiqe_1, apt_exam_pratiqe_2, apt_exam_theoriqe_1, 
          apt_exam_theoriqe_2, inapt_exam_theoriqe_1, inapt_exam_theoriqe_2
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const insertValues = [
        candidate_id, jour_pours_legaliser, exam_medical, frais_de_timbre, la_fin_de_la_formation,
        les_devoirs_finaancier_de_letablissement, exam_theoriqe_1, exam_theoriqe_2,
        exam_pratiqe_1, exam_pratiqe_2, examen_exceptionnel, inapt_exam_pratiqe_1,
        inapt_exam_pratiqe_2, apt_exam_pratiqe_1, apt_exam_pratiqe_2, apt_exam_theoriqe_1,
        apt_exam_theoriqe_2, inapt_exam_theoriqe_1, inapt_exam_theoriqe_2
      ];

      await connection.execute(insertQuery, insertValues);

      // تحديث حالة المرشح بعد الإدراج
      await updateCandidateState(connection, candidate_id);

      res.status(201).json({ success: true, message: 'Data inserted successfully' });
    }

  } catch (err) {
    console.error('Error processing data:', err.message);
    res.status(500).json({ success: false, message: 'Error processing data', error: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;