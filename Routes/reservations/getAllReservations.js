const express = require('express');
const router = express.Router();
const { pool } = require('../../database');

// Endpoint لاسترجاع البيانات من الجداول: reservations, candidates, و financier_de_letablissement
router.get('/getAllReservations', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // استعلام لجلب البيانات من الجداول
        const [rows] = await connection.execute(`
            SELECT 
                reservations.id,
                reservations.candidate_id,
                reservations.month,
                reservations.nome,
                reservations.cin,
                reservations.prenom,
                reservations.school_nomschool,
                reservations.state,
                candidates.adresse, 
                candidates.telephone1, 
                candidates.telephone2, 
                candidates.datedinscription, 
                candidates.n_permis,
                candidates.paiment_total_necessair,
                candidates.date_dexpiration, 
                candidates.date_dexpiration_permis, 
                candidates.date_naissance, 
                candidates.number_duserie, 
                candidates.Numéro_desérie_pardéfaut, 
                candidates.categorie_domandee, 
                candidates.valabe_pour_les_categore,
                candidates.monitor,
                candidates.cap,
                candidates.matricule,
                financier_de_letablissement.jour_pours_legaliser,
                financier_de_letablissement.exam_medical,
                financier_de_letablissement.frais_de_timbre,
                financier_de_letablissement.la_fin_de_la_formation,
                financier_de_letablissement.les_devoirs_finaancier_de_letablissement
            FROM reservations
            INNER JOIN candidates ON reservations.candidate_id = candidates.id
            INNER JOIN financier_de_letablissement ON candidates.id = financier_de_letablissement.candidate_id
        `);

        // التحقق من وجود بيانات
        if (rows.length === 0) {
            return res.status(404).json({ message: 'No records found' });
        }

        // إرسال البيانات المسترجعة
        res.status(200).json(rows);
    } catch (err) {
        console.error('Error while fetching data:', err.message);
        res.status(500).json({ message: 'An error occurred', error: err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
