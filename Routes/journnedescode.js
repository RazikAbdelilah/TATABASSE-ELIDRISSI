const express = require('express');
const router = express.Router();
const { pool } = require('../database');

// 🔹 دالة لجلب اليوم الحالي باللغة الفرنسية
function getFrenchDayName() {
    const days = {
        'Monday': 'lundi',
        'Tuesday': 'mardi',
        'Wednesday': 'mercredi',
        'Thursday': 'jeudi',
        'Friday': 'vendredi',
        'Saturday': 'samedi',
        'Sunday': 'dimanche'
    };
    return days[new Date().toLocaleDateString('en-US', { weekday: 'long' })];
}

async function fetchAllCandidates(req, res) {
    const todayFrench = getFrenchDayName(); // 🔹 جلب اليوم الحالي بالفرنسية
    let connection;

    try {
        connection = await pool.getConnection();

        // ✅ 1️⃣ جلب جميع المرشحين
        const [candidates] = await connection.execute(`
            SELECT 
                c.id AS candidate_id, 
                c.nome, 
                c.prenom, 
                c.cin, 
                c.monitor, 
                c.categorie_domandee, 
                c.nome_school
            FROM candidates c
        `);

        if (candidates.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // ✅ 2️⃣ جلب الأيام من جدول jour_ecole
        const candidateIds = candidates.map(c => c.candidate_id);
        const [jourEcoleData] = await connection.execute(`
            SELECT candidate_id, jour_ecole
            FROM jour_ecole
            WHERE candidate_id IN (${candidateIds.join(",")})
        `);

        const jourEcoleMap = new Map();
        jourEcoleData.forEach(row => {
            let jours = [];
            try {
                jours = JSON.parse(row.jour_ecole || '[]');
            } catch (err) {
                console.error(`⚠️ Erreur JSON pour candidate_id ${row.candidate_id}:`, err.message);
            }
            jourEcoleMap.set(row.candidate_id, jours);
        });

        // ✅ 3️⃣ جلب عدد مرات القيادة من جدول draveng
        const [dravengCounts] = await connection.execute(`
            SELECT candidate_id, COUNT(*) AS count_in_draveng
            FROM draveng
            WHERE candidate_id IN (${candidateIds.join(",")}) AND state_drave = 1
            GROUP BY candidate_id
        `);

        const dravengMap = new Map();
        dravengCounts.forEach(row => {
            dravengMap.set(row.candidate_id, row.count_in_draveng);
        });

        // ✅ 4️⃣ جلب الـ notes من جدول messages
        const [messages] = await connection.execute(`
            SELECT candidate_id, note
            FROM messags
            WHERE candidate_id IN (${candidateIds.join(",")})
        `);

        const notesMap = new Map();
        messages.forEach(msg => {
            notesMap.set(msg.candidate_id, msg.note);
        });

        // ✅ 5️⃣ تصفية المرشحين حسب الأيام
        const eligibleCandidates = candidates
            .filter(candidate => {
                const { candidate_id, Conduire_la_voiture, Nombre_de_temps_de_conduite } = candidate;
                const countInDraveng = dravengMap.get(candidate_id) || 0;

                if (countInDraveng >= Nombre_de_temps_de_conduite) return false;

                const days = jourEcoleMap.get(candidate_id) || [];

                return days.includes(todayFrench);
            })
            .map(candidate => ({
                id: candidate.candidate_id + 4000,
                candidate_id: candidate.candidate_id,
                nome: candidate.nome,
                prenom: candidate.prenom,
                monitor: candidate.monitor || "",
                cin: candidate.cin,
                categorie_domandee: candidate.categorie_domandee || "",
                nome_school: candidate.nome_school || "",
                date: new Date().toISOString(),
                note: notesMap.get(candidate.candidate_id) || null // 🔹 إرجاع note إن وُجد أو null
            }));

        // 🔹 ترتيب حسب monitor
        eligibleCandidates.sort((a, b) => {
            if (a.monitor < b.monitor) return -1;
            if (a.monitor > b.monitor) return 1;
            return 0;
        });

        res.json({ success: true, data: eligibleCandidates });

    } catch (err) {
        console.error('❌ Erreur:', err.message);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (connection) connection.release();
    }
}

async function fetchCandidatesBySchool(req, res) {
    const todayFrench = getFrenchDayName(); // 🔹 جلب اليوم الحالي بالفرنسية
    let connection;
    const { nome_school } = req.query; // استلام nome_school من استعلام الرابط

    if (!nome_school) {
        return res.status(400).json({ success: false, error: 'nome_school parameter is required' });
    }

    try {
        connection = await pool.getConnection();

        // ✅ 1️⃣ جلب المرشحين بناءً على nome_school
        const [candidates] = await connection.execute(`
            SELECT 
                c.id AS candidate_id, 
                c.nome, 
                c.prenom, 
                c.cin, 
                c.monitor, 
                c.categorie_domandee, 
                c.nome_school
            FROM candidates c
            WHERE c.nome_school = ?
        `, [nome_school]);

        if (candidates.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // ✅ 2️⃣ جلب الأيام من جدول jour_ecole
        const candidateIds = candidates.map(c => c.candidate_id);
        const [jourEcoleData] = await connection.execute(`
            SELECT candidate_id, jour_ecole
            FROM jour_ecole
            WHERE candidate_id IN (${candidateIds.join(",")})
        `);

        const jourEcoleMap = new Map();
        jourEcoleData.forEach(row => {
            let jours = [];
            try {
                jours = JSON.parse(row.jour_ecole || '[]');
            } catch (err) {
                console.error(`⚠️ Erreur JSON pour candidate_id ${row.candidate_id}:`, err.message);
            }
            jourEcoleMap.set(row.candidate_id, jours);
        });

        // ✅ 3️⃣ جلب عدد مرات القيادة من جدول draveng
        const [dravengCounts] = await connection.execute(`
            SELECT candidate_id, COUNT(*) AS count_in_draveng
            FROM draveng
            WHERE candidate_id IN (${candidateIds.join(",")}) AND state_drave = 1
            GROUP BY candidate_id
        `);

        const dravengMap = new Map();
        dravengCounts.forEach(row => {
            dravengMap.set(row.candidate_id, row.count_in_draveng);
        });

        // ✅ 4️⃣ جلب الـ notes من جدول messages
        const [messages] = await connection.execute(`
            SELECT candidate_id, note
            FROM messags
            WHERE candidate_id IN (${candidateIds.join(",")})
        `);

        const notesMap = new Map();
        messages.forEach(msg => {
            notesMap.set(msg.candidate_id, msg.note);
        });

        // ✅ 5️⃣ تصفية المرشحين حسب الأيام
        const eligibleCandidates = candidates
            .filter(candidate => {
                const { candidate_id, Conduire_la_voiture, Nombre_de_temps_de_conduite } = candidate;
                const countInDraveng = dravengMap.get(candidate_id) || 0;

                if (countInDraveng >= Nombre_de_temps_de_conduite) return false;

                const days = jourEcoleMap.get(candidate_id) || [];

                return days.includes(todayFrench);
            })
            .map(candidate => ({
                id: candidate.candidate_id + 4000,
                candidate_id: candidate.candidate_id,
                nome: candidate.nome,
                prenom: candidate.prenom,
                monitor: candidate.monitor || "",
                cin: candidate.cin,
                categorie_domandee: candidate.categorie_domandee || "",
                nome_school: candidate.nome_school || "",
                date: new Date().toISOString(),
                note: notesMap.get(candidate.candidate_id) || null // 🔹 إرجاع note إن وُجد أو null
            }));

        // 🔹 ترتيب حسب monitor
        eligibleCandidates.sort((a, b) => {
            if (a.monitor < b.monitor) return -1;
            if (a.monitor > b.monitor) return 1;
            return 0;
        });

        res.json({ success: true, data: eligibleCandidates });

    } catch (err) {
        console.error('❌ Erreur:', err.message);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (connection) connection.release();
    }
}

// 🔹 تعريف المسارات
router.get('/jourcode/all', fetchAllCandidates);  // رابط لجلب جميع البيانات
router.get('/jourcode', fetchCandidatesBySchool);  // رابط لجلب البيانات بناءً على nome_school

module.exports = router;
