const express = require("express");
const router = express.Router();
const multer = require("multer");
const bcrypt = require("bcryptjs");
const { pool } = require("../../database");

// إعداد multer لتخزين الصور
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// وظيفة لتحويل undefined إلى null
const safeValue = (value) => (value === undefined ? null : value);

// وظيفة لإنشاء رقم تسلسلي فريد
async function generateUniqueSerial(connection) {
  const year = new Date().getFullYear().toString().slice(-2);
  let nextSerial = 1;
  let isUnique = false;

  while (!isUnique) {
    const newNuméro_desérie_pardéfaut = `${nextSerial}/${year}`;
    const [existingSerial] = await connection.execute(
      "SELECT COUNT(*) AS count FROM candidates WHERE Numéro_desérie_pardéfaut = ?",
      [newNuméro_desérie_pardéfaut]
    );

    if (existingSerial[0].count === 0) {
      isUnique = true;
      return newNuméro_desérie_pardéfaut;
    }
    nextSerial++;
  }
}

router.post("/addinfo", upload.single("image_path"), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const io = req.app.get("io");

    const {
      nome, prenom, datedinscription, cin, password, adresse, telephone1, telephone2, 
      n_permis, date_dexpiration, date_naissance, info_sub_de_relation, date_dexpiration_permis, 
      categorie_domandee, numero_du_permis_de_conduire, valabe_pour_les_categore, 
      paiment_total_necessair, monitor, cap, matricule, state, state_drave, number_duserie, 
      Informations_du_responsable, intervale1 = 13, intervale2 = 29, intervale3 = 40, 
      intervale4 = 30, nome_school 
    } = req.body;

    if (!nome || !prenom || !cin || !password || !datedinscription) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const [existingCandidate] = await connection.execute(
      "SELECT * FROM candidates WHERE cin = ?",
      [cin]
    );
    if (existingCandidate.length > 0) {
      return res.status(400).json({ message: "Candidate with this CIN already exists" });
    }

    const newNuméro_desérie_pardéfaut = await generateUniqueSerial(connection);
    const hashedPassword = await bcrypt.hash(password, 10);
    const imagePath = req.file ? `uploads/${req.file.filename}` : null;

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
        safeValue(nome), safeValue(prenom), safeValue(datedinscription), safeValue(cin), safeValue(imagePath),
        safeValue(hashedPassword), safeValue(adresse), safeValue(telephone1), safeValue(telephone2),
        safeValue(n_permis), safeValue(date_dexpiration), safeValue(date_naissance), safeValue(info_sub_de_relation),
        safeValue(date_dexpiration_permis), safeValue(categorie_domandee), safeValue(numero_du_permis_de_conduire),
        safeValue(valabe_pour_les_categore), safeValue(paiment_total_necessair), safeValue(monitor),
        safeValue(cap), safeValue(matricule), safeValue(state), safeValue(state_drave), safeValue(number_duserie),
        safeValue(newNuméro_desérie_pardéfaut), safeValue(Informations_du_responsable), safeValue(intervale1),
        safeValue(intervale2), safeValue(intervale3), safeValue(intervale4), safeValue(nome_school)
      ]
    );

    const candidateId = candidateResult.insertId;

    await connection.execute(
      `INSERT INTO financier_de_letablissement (
        candidate_id, jour_pours_legaliser, exam_medical, frais_de_timbre, la_fin_de_la_formation,
        les_devoirs_finaancier_de_letablissement, exam_theoriqe_1, exam_theoriqe_2, exam_pratiqe_1,
        exam_pratiqe_2, apt_exam_theoriqe_1, apt_exam_theoriqe_2, inapt_exam_theoriqe_1,
        inapt_exam_theoriqe_2, apt_exam_pratiqe_1, apt_exam_pratiqe_2, inapt_exam_pratiqe_1,
        inapt_exam_pratiqe_2
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [candidateId, false, false, false, false, false, null, null, null, null, false, false, false, false, false, false, false, false]
    );

    await connection.commit(); // تأكيد المعاملة لضمان حفظ البيانات فورًا

    const newCandidate = {
      id: candidateId,
      nome,
      prenom,
      cin,
      datedinscription,
      image_path: imagePath,
    };
    io.emit("candidateAdded", newCandidate);

    res.status(201).json({
      message: "Candidat inscrit avec succès",
      candidateId: candidateId,
      Numéro_desérie_pardéfaut: newNuméro_desérie_pardéfaut,
      imagePath: imagePath,
    });
  } catch (err) {
    await connection.rollback();
    console.error("Error while adding candidate:", err.message);
    res.status(500).json({ message: "An error occurred", error: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
