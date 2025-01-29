const express = require('express');
const router = express.Router();
const { pool } = require('../../database');


// استخدام middleware للتحقق من التوكن قبل الوصول إلى الـ route
router.get('/getall',  async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [results] = await connection.execute(`
      SELECT 
        c.*, 
        a.id AS avance_id, a.montant, a.date AS avance_date,
        d.id AS drave_id, d.Morningorevening, d.state_drave, d.change_state, d.date AS drave_date,
        v.Conduire_la_voiture, v.Nombre_de_temps_de_conduite
      FROM candidates c
      LEFT JOIN avances a ON c.id = a.candidate_id
      LEFT JOIN draveng d ON c.id = d.candidate_id  
      LEFT JOIN Conduire_la_voiture v ON c.id = v.candidate_id
    `);

    if (results.length === 0) {
      return res.status(404).json({ message: 'No candidates found' });
    }

    const candidats = results.reduce((acc, row) => {
      const {
        id, nome, prenom, datedinscription, cin, password, adresse,
        telephone1, telephone2, n_permis, date_dexpiration, info_sub_de_relation,
        date_dexpiration_permis, categorie_domandee, numero_du_permis_de_conduire,
        valabe_pour_les_categore, paiment_total_necessair, monitor, cap, matricule,
        state, state_drave, number_duserie, Numéro_desérie_pardéfaut,
        Informations_du_responsable, intervale1, intervale2, intervale3, intervale4,
        nome_school,
        avance_id, montant, avance_date,
        drave_id, Morningorevening, state_drave: drave_state, change_state, drave_date,
        Conduire_la_voiture, Nombre_de_temps_de_conduite
      } = row;

      let candidate = acc.find(c => c.id === id);

      if (!candidate) {
        candidate = {
          id,
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
          paiment_total_necessair: parseFloat(paiment_total_necessair),
          monitor,
          cap,
          matricule,
          state,
          state_drave,
          number_duserie,
          Numéro_desérie_pardéfaut,
          Informations_du_responsable,
          intervale1,
          intervale2,
          intervale3,
          intervale4,
          nome_school,
          Conduire_la_voiture: Conduire_la_voiture ? JSON.parse(Conduire_la_voiture) : null,
          Nombre_de_temps_de_conduite,
          avances: [],
          draves: [],
        };
        acc.push(candidate);
      }

      if (avance_id) {
        candidate.avances.push({
          id: avance_id,
          montant: parseFloat(montant),
          date: avance_date,
        });
      }

      if (drave_id) {
        candidate.draves.push({
          id: drave_id,
          Morningorevening,
          state_drave: drave_state,
          change_state,
          date: drave_date,
        });
      }

      return acc;
    }, []);

    // إرسال إشعار عبر WebSocket بعد جلب البيانات
    if (req.app.io) {
      req.app.io.emit('candidatesRetrieved', {
        message: 'Candidates information retrieved successfully',
        data: candidats,
      });
    }

    res.status(200).json({
      message: 'All candidates with full details retrieved successfully',
      data: candidats,
    });
  } catch (err) {
    console.error('Error while retrieving candidates:', err.message);
    res.status(500).json({
      message: 'An error occurred',
      error: err.message,
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
