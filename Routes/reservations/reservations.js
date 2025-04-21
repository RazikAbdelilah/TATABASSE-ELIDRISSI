const express = require('express');
const router = express.Router();
const { pool } = require('../../database');

// Endpoint لإضافة حجز جديد مع تاريخ كامل
router.post('/addReservation', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // Récupération des données de la requête
        const { candidate_id, month, school_nomschool, nome, prenom, cin, categorie_domandee } = req.body;

        // Vérification des champs obligatoires
        if (!candidate_id || !school_nomschool || !nome || !prenom || !cin || !categorie_domandee) {
            return res.status(400).json({
                message: 'Champs obligatoires manquants (candidate_id, school_nomschool, nome, prenom, cin, categorie_domandee)',
                champsManquants: {
                    candidate_id: !candidate_id,
                    school_nomschool: !school_nomschool,
                    nome: !nome,
                    prenom: !prenom,
                    cin: !cin,
                    categorie_domandee: !categorie_domandee
                }
            });
        }

        // Vérification de l'existence du candidat
        const [candidateExists] = await connection.execute(
            `SELECT id FROM candidates WHERE id = ?`,
            [candidate_id]
        );

        if (candidateExists.length === 0) {
            return res.status(404).json({
                message: 'Candidat non trouvé',
                details: `Aucun candidat avec l'ID ${candidate_id} n'a été trouvé`
            });
        }

        // Vérification des réservations existantes pour ce candidat
        const [existingReservations] = await connection.execute(
            `SELECT COUNT(*) as count FROM reservations WHERE candidate_id = ?`,
            [candidate_id]
        );

        if (existingReservations[0].count > 0) {
            return res.status(409).json({
                message: 'Réservation existante',
                details: 'Une réservation existe déjà pour ce candidat'
            });
        }

        // Formatage du mois (si fourni)
        const monthValue = month ? new Date(new Date().getFullYear(), month - 1, 1) : null;

        // Insertion de la réservation
        await connection.execute(
            `INSERT INTO reservations (candidate_id, month, state, school_nomschool, nome, prenom, cin, categorie_domandee) 
             VALUES (?, ?, 'provisoire', ?, ?, ?, ?, ?)`,
            [candidate_id, monthValue, school_nomschool, nome, prenom, cin, categorie_domandee]
        );

        res.status(201).json({ 
            message: 'Réservation créée avec succès',
            details: {
                candidate_id,
                month: monthValue,
                state: 'provisoire',
                school_nomschool,
                nome,
                prenom,
                cin,
                categorie_domandee
            }
        });
    } catch (err) {
        console.error('Erreur lors de la création de la réservation:', err.message);
        res.status(500).json({ 
            message: 'Erreur interne du serveur',
            details: err.message 
        });
    } finally {
        connection.release();
    }
});


router.put('/updateReservation', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { candidate_id, newMonth } = req.body;

        // التحقق من وجود الحقول المطلوبة
        if (!candidate_id || !newMonth) {
            return res.status(400).json({
                message: 'Missing required fields (candidate_id, newMonth)',
            });
        }

        // تحقق من صحة تنسيق التاريخ
        const newMonthDate = new Date(newMonth);
        if (isNaN(newMonthDate.getTime())) {
            return res.status(400).json({
                message: 'Invalid date format for newMonth',
            });
        }

        // استرجاع سجل الحجز للتحقق
        const [reservation] = await connection.execute(
            `SELECT * FROM reservations WHERE candidate_id = ?`,
            [candidate_id]
        );

        if (reservation.length === 0) {
            return res.status(404).json({
                message: 'Reservation not found for the given candidate_id',
            });
        }

        const currentReservation = reservation[0];
        const { school_nomschool, categorie_domandee } = currentReservation;

        // استرجاع معلومات المدرسة من جدول nomschool
        const [schoolData] = await connection.execute(
            `SELECT * FROM nomschool WHERE number_school = ?`,
            [school_nomschool]
        );

        if (schoolData.length === 0) {
            return res.status(404).json({
                message: 'School data not found for the given school_nomschool',
            });
        }

        const school = schoolData[0];

        // تحديد الحد الأقصى بناءً على الفئة
        const cotaColumn = `cota_${categorie_domandee}`;
        const maxCota = parseInt(school[cotaColumn], 10);

        if (isNaN(maxCota)) {
            return res.status(400).json({
                message: `Invalid cota configuration for category ${categorie_domandee}`,
            });
        }

        // حساب عدد الحجوزات الحالية في الشهر الجديد لنفس الفئة والمدرسة
        const monthForQuery = newMonthDate.getMonth() + 1; // +1 لأن JavaScript يعتبر يناير = 0
        const yearForQuery = newMonthDate.getFullYear();

        const [reservationsInMonth] = await connection.execute(
            `SELECT COUNT(*) as count 
             FROM reservations 
             WHERE school_nomschool = ? AND categorie_domandee = ? AND MONTH(month) = ? AND YEAR(month) = ? AND state = 'définitif'`,
            [
                school_nomschool,
                categorie_domandee,
                monthForQuery,
                yearForQuery,
            ]
        );

        if (reservationsInMonth[0].count >= maxCota) {
            return res.status(400).json({
                message: `Cota limit reached for category ${categorie_domandee} in the selected month`,
            });
        }

        // تحديث الشهر والحالة
        // نستخدم newMonth مباشرة إذا كان بتنسيق YYYY-MM-DD
        // أو نستخدم newMonthDate.toISOString().split('T')[0] لتحويله للتنسيق الصحيح
        await connection.execute(
            `UPDATE reservations 
             SET month = ?, state = 'définitif' 
             WHERE candidate_id = ?`,
            [newMonthDate.toISOString().split('T')[0], candidate_id]
        );

        res.status(200).json({ 
            message: 'Reservation updated successfully',
            updatedMonth: newMonthDate.toISOString().split('T')[0] // لإظهار التاريخ الذي تم تخزينه
        });
    } catch (err) {
        console.error('Error while updating reservation record:', err.message);
        res.status(500).json({ 
            message: 'An error occurred', 
            error: err.message 
        });
    } finally {
        connection.release(); // إغلاق الاتصال دائمًا
    }
});


router.put('/updateReservationtoprovisoire', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { candidate_id } = req.body;

        // التحقق من وجود الحقل المطلوب
        if (!candidate_id) {
            return res.status(400).json({
                message: 'Missing required field (candidate_id)',
            });
        }

        // استرجاع سجل الحجز للتحقق
        const [reservation] = await connection.execute(
            `SELECT * FROM reservations WHERE candidate_id = ?`,
            [candidate_id]
        );

        if (reservation.length === 0) {
            return res.status(404).json({
                message: 'Reservation not found for the given candidate_id',
            });
        }

        // تحديث الحقل month إلى NULL والحالة إلى 'provisoire'
        await connection.execute(
            `UPDATE reservations 
             SET month = NULL, state = 'provisoire' 
             WHERE candidate_id = ?`,
            [candidate_id]
        );

        res.status(200).json({ message: 'Reservation updated successfully - month removed and state set to provisoire' });
    } catch (err) {
        console.error('Error while updating reservation record:', err.message);
        res.status(500).json({ message: 'An error occurred', error: err.message });
    } finally {
        connection.release(); // إغلاق الاتصال دائمًا
    }
});









module.exports = router;
