const express = require('express');
const router = express.Router();

const bcrypt = require('bcryptjs');

const { pool } = require('../../database');






// تعديل المعلومات 
router.put('/updateinfo/:id', async (req, res) => {
  const connection = await pool.getConnection();
  const { id } = req.params;  // استخراج الـ ID من الرابط
  const {
    nome,
    prenom,
    datedinscription,
    cin,
    password,
    adresse,
    telephone1,
    telephone2,
    n_permis,
    date_dexpiration,
    info_sub_de_relation,
    date_dexpiration_permis,
    categorie_domandee,
    numero_du_permis_de_conduire,
    valabe_pour_les_categore,
    paiment_total_necessair,
    monitor,
    cap,
    matricule,
    state,
    state_drave,
    number_duserie,
    Numéro_desérie_pardéfaut,
    Informations_du_responsable,
    intervale1 = 5,
    intervale2 = 10,
    intervale3 = 20,
    intervale4 = 30,
    nome_school,
  } = req.body;

  // التحقق من وجود الحقول المطلوبة في الطلب
  if (!nome || !prenom || !cin || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // تشفير كلمة المرور الجديدة إذا تم إرسالها
  const hashedPassword = await bcrypt.hash(password, 10);

  const connections = await pool.getConnection();

  try {
    await connection.beginTransaction();  // بدء المعاملة

    // استعلام لتحديث بيانات المرشح بناءً على الـ id
    const [result] = await connections.execute(`
      UPDATE candidates
      SET 
        nome = ?, 
        prenom = ?, 
        datedinscription = ?, 
        cin = ?, 
        password = ?, 
        adresse = ?, 
        telephone1 = ?, 
        telephone2 = ?, 
        n_permis = ?, 
        date_dexpiration = ?, 
        info_sub_de_relation = ?, 
        date_dexpiration_permis = ?, 
        categorie_domandee = ?, 
        numero_du_permis_de_conduire = ?, 
        valabe_pour_les_categore = ?, 
        paiment_total_necessair = ?, 
        monitor = ?, 
        cap = ?, 
        matricule = ?, 
        state = ?, 
        state_drave = ?, 
        number_duserie = ?, 
        Numéro_desérie_pardéfaut = ?, 
        Informations_du_responsable = ?, 
        intervale1 = ?, 
        intervale2 = ?, 
        intervale3 = ?, 
        intervale4 = ?, 
        nome_school = ?
      WHERE id = ?
    `, [
      nome, prenom, datedinscription, cin, hashedPassword, adresse, telephone1, telephone2,
      n_permis, date_dexpiration, info_sub_de_relation, date_dexpiration_permis,
      categorie_domandee, numero_du_permis_de_conduire, valabe_pour_les_categore,
      paiment_total_necessair, monitor, cap, matricule, state, state_drave,
      number_duserie, Numéro_desérie_pardéfaut, Informations_du_responsable,
      intervale1, intervale2, intervale3, intervale4, nome_school, id
    ]);

    // التحقق من نجاح التحديث
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    await connections.commit();  // تأكيد المعاملة
   

// إرسال حدث إلى جميع العملاء المتصلين عبر WebSocket
req.app.io.emit('newCandidate', {
  message: 'New candidate added',
  candidateId: result.insertId,
  nome,
  prenom,
  imagePath
});


    res.status(200).json({
      message: 'Candidate information updated successfully',
    });
  } catch (err) {
    await connection.rollback();  // التراجع عن المعاملة في حالة حدوث خطأ
    console.error('Error while updating candidate:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    connection.release();  // إطلاق الاتصال
  }
});



module.exports = router;