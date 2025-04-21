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

async function fetchEligibleDrivers(req, res) {
    const todayFrench = getFrenchDayName(); // 🔹 جلب اليوم الحالي بالفرنسية
    let connection;

    try {
        connection = await pool.getConnection();
      

        // ✅ 1️⃣ جلب جميع المرشحين المؤهلين (باستخدام `conduire_la_voiture` بالحروف الصغيرة)
        const [candidates] = await connection.execute(`
            SELECT 
                c.id AS candidate_id, 
                c.nome, 
                c.prenom, 
                c.cin, 
                c.monitor, 
                c.categorie_domandee, 
                c.nome_school,
                cv.Conduire_la_voiture,  -- ✅ مصفوفة الأيام
                cv.Nombre_de_temps_de_conduite,
                c.state,
                c.state_drave,
                f.inapt_exam_theoriqe_1,
                f.inapt_exam_theoriqe_2
            FROM candidates c
            JOIN conduire_la_voiture cv ON c.id = cv.candidate_id  -- ✅ تعديل اسم الجدول هنا
            LEFT JOIN financier_de_letablissement f ON c.id = f.candidate_id
            WHERE c.state NOT IN ('Pasbon', 'pratique')
            AND (c.state_drave != 'Pasbon' OR c.state_drave IS NULL)
            AND (f.inapt_exam_theoriqe_1 != true OR f.inapt_exam_theoriqe_1 IS NULL)
            AND (f.inapt_exam_theoriqe_2 != true OR f.inapt_exam_theoriqe_2 IS NULL)
        `);

        // ✅ إذا لم يكن هناك أي مرشح مؤهل
        if (candidates.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // ✅ 2️⃣ جلب عدد مرات القيادة لكل مرشح من `draveng`
        const candidateIds = candidates.map(c => c.candidate_id);
        if (candidateIds.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const [dravengCounts] = await connection.execute(`
            SELECT candidate_id, COUNT(*) AS count_in_draveng
            FROM draveng
            WHERE candidate_id IN (${candidateIds.join(",")}) AND state_drave = 1
            GROUP BY candidate_id
        `);

        // 🔹 تخزين عدد مرات القيادة لكل مرشح
        const dravengMap = new Map();
        dravengCounts.forEach(row => {
            dravengMap.set(row.candidate_id, row.count_in_draveng);
        });

        // ✅ 3️⃣ تصفية المرشحين بجافاسكريبت بدلاً من SQL
        const eligibleCandidates = candidates
            .filter(candidate => {
                const { candidate_id, Conduire_la_voiture, Nombre_de_temps_de_conduite } = candidate;
                const countInDraveng = dravengMap.get(candidate_id) || 0;

                // استبعاد المرشحين الذين استوفوا الحد الأقصى للقيادة
                if (countInDraveng >= Nombre_de_temps_de_conduite) return false;

                let days = [];
                try {
                    days = JSON.parse(Conduire_la_voiture || '[]'); // تحويل JSON إلى مصفوفة
                } catch (err) {
                    console.error(`⚠️ خطأ في JSON لـ ${candidate.nome} ${candidate.prenom}:`, err.message);
                    return false;
                }

                // ✅ تصفية الأيام باستخدام `Array.includes()`
                return Array.isArray(days) && days.includes(todayFrench);
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
                date: new Date().toISOString()
            }));

        // 🔹 ترتيب المرشحين حسب الـ monitor
        eligibleCandidates.sort((a, b) => {
            if (a.monitor < b.monitor) return -1;
            if (a.monitor > b.monitor) return 1;
            return 0;
        });

        res.json({ success: true, data: eligibleCandidates });

    } catch (err) {
        console.error('❌ خطأ عام:', err.message);
        res.status(500).json({ success: false, error: err.message }); // ✅ عرض الخطأ الحقيقي
    } finally {
        if (connection) connection.release();
    }
}

// 🔹 تعريف المسار
router.get('/eligible', fetchEligibleDrivers);

module.exports = router;
