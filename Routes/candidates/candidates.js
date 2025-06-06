const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { pool } = require("../../database");


// Fonction pour convertir undefined en null
const safeValue = (value) => (value === undefined ? null : value);

// Verrou pour éviter les conflits de numéros de série
const serialLock = new Map();

// Génération de numéro de série unique
async function generateUniqueSerial(connection, year) {
  const lockKey = `serial-${year}`;
  
  while (serialLock.has(lockKey)) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  try {
    serialLock.set(lockKey, true);
    
    let nextSerial = 1;
    let isUnique = false;
    let newNuméro_desérie_pardéfaut;

    while (!isUnique) {
      newNuméro_desérie_pardéfaut = `${nextSerial}/${year}`;
      const [existingSerial] = await connection.execute(
        "SELECT COUNT(*) AS count FROM candidates WHERE Numéro_desérie_pardéfaut = ?",
        [newNuméro_desérie_pardéfaut]
      );

      if (existingSerial[0].count === 0) {
        isUnique = true;
      } else {
        nextSerial++;
      }
    }
    
    return newNuméro_desérie_pardéfaut;
  } finally {
    serialLock.delete(lockKey);
  }
}

router.post("/addinfo", async (req, res) => {
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

    // Vérification des champs obligatoires
    const requiredFields = ['nome', 'prenom', 'cin', 'password', 'datedinscription'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `Champs obligatoires manquants: ${missingFields.join(', ')}`
      });
    }

    // Vérification de l'unicité du CIN
    const [existingCandidate] = await connection.execute(
      "SELECT * FROM candidates WHERE cin = ?",
      [cin]
    );
    if (existingCandidate.length > 0) {
      return res.status(400).json({ message: "Un candidat avec ce CIN existe déjà." });
    }

    // Génération du numéro de série
    const year = new Date().getFullYear().toString().slice(-2);
    const newNuméro_desérie_pardéfaut = await generateUniqueSerial(connection, year);
    
    // Hashage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertion du candidat
    const [candidateResult] = await connection.execute(
      `INSERT INTO candidates (
        nome, prenom, datedinscription, cin, password, adresse, telephone1, telephone2,
        n_permis, date_dexpiration, date_naissance, info_sub_de_relation, date_dexpiration_permis,
        categorie_domandee, numero_du_permis_de_conduire, valabe_pour_les_categore,
        paiment_total_necessair, monitor, cap, matricule, state, state_drave,
        number_duserie, Numéro_desérie_pardéfaut, Informations_du_responsable,
        intervale1, intervale2, intervale3, intervale4, nome_school
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        safeValue(nome), safeValue(prenom), safeValue(datedinscription), safeValue(cin),
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

    // Insertion des informations financières
    await connection.execute(
      `INSERT INTO financier_de_letablissement (
        candidate_id, jour_pours_legaliser, exam_medical, frais_de_timbre, la_fin_de_la_formation,
        les_devoirs_finaancier_de_letablissement, exam_theoriqe_1, exam_theoriqe_2, exam_pratiqe_1,
        exam_pratiqe_2, apt_exam_theoriqe_1, apt_exam_theoriqe_2, inapt_exam_theoriqe_1,
        inapt_exam_theoriqe_2, apt_exam_pratiqe_1, apt_exam_pratiqe_2, inapt_exam_pratiqe_1,
        inapt_exam_pratiqe_2
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [candidateId, false, false, false, false, false, null, null, null, null, false, false, false, false, false, false, false, false]
    );

    await connection.commit();

    // Notification en temps réel
    const newCandidate = {
      id: candidateId,
      nome,
      prenom,
      cin,
      datedinscription,
    };
    io.emit("candidateAdded", newCandidate);

    res.status(201).json({
      message: "Candidat inscrit avec succès",
      candidateId: candidateId,
      Numéro_desérie_pardéfaut: newNuméro_desérie_pardéfaut,
    });
  } catch (err) {
    await connection.rollback();
    console.error("Erreur lors de l'ajout du candidat:", err.message);
    res.status(500).json({ 
      message: "Une erreur s'est produite lors du traitement de la demande",
      error: err.message 
    });
  } finally {
    connection.release();
  }
});

// تعديل حقل state بناءً على id
router.put('/candidates/:id/state', async (req, res) => {
  const { id } = req.params;
  const { state } = req.body;

  if (!state) {
      return res.status(400).json({ error: 'حقل state مطلوب' });
  }

  try {
      const query = 'UPDATE candidates SET state = $1 WHERE id = $2 RETURNING *';
      const { rows } = await pool.query(query, [state, id]);

      if (rows.length === 0) {
          return res.status(404).json({ error: 'لم يتم العثور على المرشح' });
      }

      res.json(rows[0]);
  } catch (error) {
      console.error('خطأ في تحديث state:', error);
      res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

module.exports = router;
