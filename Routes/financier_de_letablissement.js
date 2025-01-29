const express = require('express');
const router = express.Router(); // تعريف الـ Router
const { pool } = require('../database');

// مسار لإضافة البيانات إلى جدول financier_de_letablissement
router.post('/financier_de_letablissement', async (req, res) => {
  const {
    candidate_id,
    jour_pours_legaliser,
    exam_medical,
    frais_de_timbre,
    la_fin_de_la_formation,
    les_devoirs_finaancier_de_letablissement,
    exam_theoriqe_1, // تأكد من أن التاريخ تم إرساله بالتنسيق الصحيح
    exam_theoriqe_2, // تأكد من أن التاريخ تم إرساله بالتنسيق الصحيح
    exam_pratiqe_1, // تأكد من أن التاريخ تم إرساله بالتنسيق الصحيح
    exam_pratiqe_2,
    inapt_exam_pratiqe_1,
    inapt_exam_pratiqe_2,
    apt_exam_pratiqe_1,
    apt_exam_pratiqe_2,
    apt_exam_theoriqe_1,
    apt_exam_theoriqe_2,
    inapt_exam_theoriqe_1, // تأكد من أن التاريخ تم إرساله بالتنسيق الصحيح
    inapt_exam_theoriqe_2
  } = req.body;

  // التحقق من البيانات المدخلة
  if (!candidate_id) {
    return res.status(400).json({ success: false, message: 'Candidate ID is required' });
  }

  const connection = await pool.getConnection();

  try {
    // استعلام لإضافة البيانات إلى جدول financier_de_letablissement
    await connection.execute(`
      INSERT INTO financier_de_letablissement 
      (candidate_id, jour_pours_legaliser, exam_medical, frais_de_timbre, la_fin_de_la_formation, 
       les_devoirs_finaancier_de_letablissement, exam_theoriqe_1, exam_theoriqe_2, exam_pratiqe_1, exam_pratiqe_2,
       inapt_exam_pratiqe_2 ,inapt_exam_pratiqe_1, apt_exam_pratiqe_1 , apt_exam_pratiqe_1 , apt_exam_theoriqe_1 , apt_exam_theoriqe_2 , inapt_exam_theoriqe_1 ,inapt_exam_theoriqe_2)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? , ? , ? , ? )
    `, [
      candidate_id,
      jour_pours_legaliser,
      exam_medical,
      frais_de_timbre,
      la_fin_de_la_formation,
      les_devoirs_finaancier_de_letablissement,
      exam_theoriqe_1, // تأكد من أن التاريخ تم إرساله بالتنسيق الصحيح
      exam_theoriqe_2, // تأكد من أن التاريخ تم إرساله بالتنسيق الصحيح
      exam_pratiqe_1, // تأكد من أن التاريخ تم إرساله بالتنسيق الصحيح
      exam_pratiqe_2,
      inapt_exam_pratiqe_1,
      inapt_exam_pratiqe_2,
      apt_exam_pratiqe_1,
      apt_exam_pratiqe_2,
      apt_exam_theoriqe_1,
      apt_exam_theoriqe_2,
      inapt_exam_theoriqe_1, // تأكد من أن التاريخ تم إرساله بالتنسيق الصحيح
      inapt_exam_theoriqe_2 // تأكد من أن التاريخ تم إرساله بالتنسيق الصحيح
    ]);

    // إرسال استجابة بنجاح العملية
    res.status(200).json({ success: true, message: 'Data added successfully' });
  } catch (err) {
    console.error('Error adding data to financier_de_letablissement:', err.message);
    res.status(500).json({ success: false, message: 'Error adding data' });
  } finally {
    connection.release();
  }
});



// مسار لتحديث البيانات في جدول financier_de_letablissement
router.put('/financier_de_letablissement/:candidate_id', async (req, res) => {
  const candidate_id = req.params.candidate_id; // استلام candidate_id من الرابط
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
     inapt_exam_pratiqe_1,
      inapt_exam_pratiqe_2,
      apt_exam_pratiqe_1,
      apt_exam_pratiqe_2,
      apt_exam_theoriqe_1,
      apt_exam_theoriqe_2,
      inapt_exam_theoriqe_1, // تأكد من أن التاريخ تم إرساله بالتنسيق الصحيح
      inapt_exam_theoriqe_2
  } = req.body;

  const connection = await pool.getConnection();

  try {
    // استعلام لتحديث البيانات بناءً على candidate_id
    const [result] = await connection.execute(`
      UPDATE financier_de_letablissement 
      SET jour_pours_legaliser = ?, 
          exam_medical = ?, 
          frais_de_timbre = ?, 
          la_fin_de_la_formation = ?, 
          les_devoirs_finaancier_de_letablissement = ?, 
          exam_theoriqe_1 = ?, 
          exam_theoriqe_2 = ?, 
          exam_pratiqe_1 = ?, 
          exam_pratiqe_2 = ?, 
          inapt_exam_pratiqe_1 = ?, 
          inapt_exam_pratiqe_2 = ?, 
          apt_exam_pratiqe_1 = ?, 
          apt_exam_pratiqe_2 = ?, 
          apt_exam_theoriqe_1 = ?, 
          apt_exam_theoriqe_2 = ?, 
          inapt_exam_theoriqe_1 = ?,
          inapt_exam_theoriqe_2 = ?
      WHERE candidate_id = ?
    `, [
      jour_pours_legaliser,
      exam_medical,
      frais_de_timbre,
      la_fin_de_la_formation,
      les_devoirs_finaancier_de_letablissement,
      exam_theoriqe_1,
      exam_theoriqe_2,
      exam_pratiqe_1,
      exam_pratiqe_2,
      inapt_exam_pratiqe_1,
      inapt_exam_pratiqe_2,
      apt_exam_pratiqe_1,
      apt_exam_pratiqe_2,
      apt_exam_theoriqe_1,
      apt_exam_theoriqe_2,
      inapt_exam_theoriqe_1, // تأكد من أن التاريخ تم إرساله بالتنسيق الصحيح
      inapt_exam_theoriqe_2,
      candidate_id
    ]);

    // التحقق من نجاح التحديث
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Candidate not found or no changes made' });
    }

    // إرسال استجابة بنجاح العملية
    res.status(200).json({ success: true, message: 'Data updated successfully' });
  } catch (err) {
    console.error('Error updating data in financier_de_letablissement:', err.message);
    res.status(500).json({ success: false, message: 'Error updating data' });
  } finally {
    connection.release();
  }
});

module.exports = router; // تصدير الـ Router
