const pool = require('./database'); // الاتصال بقاعدة البيانات
const moment = require('moment'); // مكتبة لتنسيق التواريخ

// استعلام لجلب البيانات بناءً على المدخلات
const getData = async (dateFrom, dateTo, schoolName) => {
    try {
        let whereClauses = [];
        let queryParams = [];

        // تحديد الفلترة على التاريخ
        if (dateFrom && dateTo) {
            whereClauses.push(`c.datedinscription BETWEEN ? AND ?`);
            queryParams.push(dateFrom, dateTo);
        } else {
            const today = moment().format('YYYY-MM-DD'); // جلب تاريخ اليوم
            whereClauses.push(`c.datedinscription = ?`);
            queryParams.push(today);
        }

        // تحديد الفلترة على اسم المدرسة
        if (schoolName) {
            whereClauses.push(`c.nome_school = ?`);
            queryParams.push(schoolName);
        }

        // الشرط النهائي
        const whereCondition = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // الاستعلام الرئيسي
        const query = `
            SELECT 
                c.nome_school AS school_name,
                COUNT(c.id) AS candidates_count, 
                COALESCE(SUM(a.montant), 0) AS total_avances,
                COALESCE(SUM(h.montant), 0) AS total_heurs,
                (SELECT COALESCE(SUM(hn.montant), 0) 
                 FROM heure_nouveaux hn 
                 WHERE hn.date = COALESCE(?, CURDATE()) 
                 ${schoolName ? "AND hn.nome_school = ?" : ""}) AS total_heure_nouveaux
            FROM candidates c
            LEFT JOIN avances a ON c.id = a.candidate_id AND a.date = COALESCE(?, CURDATE())
            LEFT JOIN heurs h ON c.id = h.candidate_id AND h.date = COALESCE(?, CURDATE())
            ${whereCondition}
            GROUP BY c.nome_school;
        `;

        if (schoolName) {
            queryParams.push(schoolName); // إضافة اسم المدرسة لاستعلام heure_nouveaux
        }
        queryParams.push(dateFrom || moment().format('YYYY-MM-DD')); // إضافة تاريخ لـ heure_nouveaux
        queryParams.push(dateFrom || moment().format('YYYY-MM-DD')); // إضافة تاريخ لـ avances
        queryParams.push(dateFrom || moment().format('YYYY-MM-DD')); // إضافة تاريخ لـ heurs

        const [rows] = await pool.query(query, queryParams);
        return rows;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
};

module.exports = { getData };
