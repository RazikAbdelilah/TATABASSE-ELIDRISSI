const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { pool } = require('../../database');

// إعداد multer لتخزين الصور
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

router.post('/addinfo', upload.single('image_path'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

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
      date_naissance,
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
      Informations_du_responsable,
      intervale1 = 5,
      intervale2 = 10,
      intervale3 = 20,
      intervale4 = 30,
      nome_school,
    } = req.body;

    if (!nome || !prenom || !cin || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const [existingCandidate] = await connection.execute('SELECT * FROM candidates WHERE cin = ?', [cin]);
    if (existingCandidate.length > 0) {
      return res.status(400).json({ message: 'Candidate with this CIN already exists' });
    }

    const year = new Date().getFullYear().toString().slice(-2);
    const [lastSerial] = await connection.execute('SELECT Numéro_desérie_pardéfaut FROM candidates WHERE Numéro_desérie_pardéfaut LIKE ?', [`%/${year}`]);
    const nextSerial = lastSerial.length > 0
      ? parseInt(lastSerial[lastSerial.length - 1].Numéro_desérie_pardéfaut.split('/')[0]) + 1
      : 1;

    const newNuméro_desérie_pardéfaut = `${nextSerial}/${year}`;
    const hashedPassword = await bcrypt.hash(password, 10);
    const imagePath = req.file ? `uploads/${req.file.filename}` : null;

    // إضافة المرشح إلى جدول candidates
    const [candidateResult] = await connection.execute(
      `INSERT INTO candidates (
        nome, prenom, datedinscription, cin, image_path, password, adresse, telephone1, telephone2,
        n_permis, date_dexpiration, date_naissance, info_sub_de_relation, date_dexpiration_permis,
        categorie_domandee, numero_du_permis_de_conduire, valabe_pour_les_categore,
        paiment_total_necessair, monitor, cap, matricule, state, state_drave,
        number_duserie, Numéro_desérie_pardéfaut, Informations_du_responsable,
        intervale1, intervale2, intervale3, intervale4, nome_school
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        nome, prenom, datedinscription, cin, imagePath, hashedPassword, adresse, telephone1, telephone2,
        n_permis, date_dexpiration, date_naissance, info_sub_de_relation, date_dexpiration_permis,
        categorie_domandee, numero_du_permis_de_conduire, valabe_pour_les_categore,
        paiment_total_necessair, monitor, cap, matricule, state, state_drave,
        number_duserie, newNuméro_desérie_pardéfaut, Informations_du_responsable,
        intervale1, intervale2, intervale3, intervale4, nome_school,
      ]
    );

    const candidateId = candidateResult.insertId;

    // إضافة سجل جديد في جدول financier_de_letablissement
    await connection.execute(
      `INSERT INTO financier_de_letablissement (
        candidate_id, jour_pours_legaliser, exam_medical, frais_de_timbre, la_fin_de_la_formation,
        les_devoirs_finaancier_de_letablissement, exam_theoriqe_1, exam_theoriqe_2, exam_pratiqe_1,
        exam_pratiqe_2, apt_exam_theoriqe_1, apt_exam_theoriqe_2, inapt_exam_theoriqe_1,
        inapt_exam_theoriqe_2, apt_exam_pratiqe_1, apt_exam_pratiqe_2, inapt_exam_pratiqe_1,
        inapt_exam_pratiqe_2
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        candidateId, // candidate_id
        false, // jour_pours_legaliser
        false, // exam_medical
        false, // frais_de_timbre
        false, // la_fin_de_la_formation
        false, // les_devoirs_finaancier_de_letablissement
        null, // exam_theoriqe_1
        null, // exam_theoriqe_2
        null, // exam_pratiqe_1
        null, // exam_pratiqe_2
        null, // apt_exam_theoriqe_1
        null, // apt_exam_theoriqe_2
        null, // inapt_exam_theoriqe_1
        null, // inapt_exam_theoriqe_2
        null, // apt_exam_pratiqe_1
        null, // apt_exam_pratiqe_2
        null, // inapt_exam_pratiqe_1
        null, // inapt_exam_pratiqe_2
      ]
    );

    await connection.commit();

    // إرسال إشعار عبر WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('candidateAdded', {
        id: candidateId,
        nome,
        prenom,
        datedinscription,
        cin,
        image_path: imagePath,
        adresse,
        telephone1,
        telephone2,
        n_permis,
        date_dexpiration,
        date_naissance,
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
        Numéro_desérie_pardéfaut: newNuméro_desérie_pardéfaut,
        Informations_du_responsable,
        intervale1,
        intervale2,
        intervale3,
        intervale4,
        nome_school,
      });
    }

    res.status(201).json({
      message: 'Candidate registered successfully',
      candidateId: candidateId,
      Numéro_desérie_pardéfaut: newNuméro_desérie_pardéfaut,
      imagePath: imagePath,
    });
  } catch (err) {
    await connection.rollback();
    console.error('Error while adding candidate:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;