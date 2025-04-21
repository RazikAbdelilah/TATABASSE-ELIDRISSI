const express = require('express');
const router = express.Router();
const { pool } = require('./database'); // اتصال قاعدة البيانات
const math = require('mathjs'); // استيراد مكتبة mathjs
const crypto = require('crypto');

require('dotenv').config(); // تحميل المتغيرات من .env

// دالة لفك تشفير القيمة باستخدام createDecipheriv
function decryptValue(encryptedValue, secretKey) {
  const algorithm = 'aes-256-cbc';
  const [ivHex, encrypted] = encryptedValue.split(':'); // فصل IV والقيمة المشفرة
  const key = crypto.scryptSync(secretKey, 'salt', 32); // مفتاح بطول 32 بايت
  const iv = Buffer.from(ivHex, 'hex'); // تحويل IV من نص hex إلى Buffer
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

router.get('/stats', async (req, res) => {
  try {
    // الحصول على المعايير من الطلب
    const { school, startDate, endDate } = req.query;

    // الحصول على تاريخ اليوم
    const today = new Date().toISOString().split('T')[0];

    // بناء شرط البحث للمدارس والمواعيد
    let whereClause = " WHERE 1=1";
    let params = [];

    if (school) {
      whereClause += " AND nome_school = ?";
      params.push(school);
    }

    if (startDate && endDate) {
      whereClause += " AND date BETWEEN ? AND ?";
      params.push(startDate, endDate);
    } else {
      whereClause += " AND date = ?";
      params.push(today);
    }

    // **استعلام لحساب عدد المترشحين خلال الفترة المحددة أو اليوم**
    let candidatesQuery = "SELECT COUNT(*) as total FROM candidates WHERE 1=1";
    let candidatesParams = [];

    if (school) {
      candidatesQuery += " AND nome_school = ?";
      candidatesParams.push(school);
    }

    if (startDate && endDate) {
      candidatesQuery += " AND DATE(datedinscription) BETWEEN ? AND ?";
      candidatesParams.push(startDate, endDate);
    } else {
      candidatesQuery += " AND DATE(datedinscription) = ?";
      candidatesParams.push(today);
    }

    // **تنفيذ الاستعلامات**
    const [candidates] = await pool.execute(candidatesQuery, candidatesParams);

    // جلب البيانات المشفرة من الجداول
    const [avancesRows] = await pool.execute(`SELECT montant FROM avances ${whereClause}`, params);
    const [heursRows] = await pool.execute(`SELECT montant FROM heurs ${whereClause}`, params);
    const [heureNouveauxRows] = await pool.execute(`SELECT montant FROM heure_nouveaux ${whereClause}`, params);

    // فك تشفير montant وحساب المجاميع
    const totalAvances = avancesRows.reduce((sum, row) => {
      const decryptedMontant = parseFloat(decryptValue(row.montant, process.env.SECRET_KEY));
      return sum + (isNaN(decryptedMontant) ? 0 : decryptedMontant);
    }, 0);

    const totalHeurs = heursRows.reduce((sum, row) => {
      const decryptedMontant = parseFloat(decryptValue(row.montant, process.env.SECRET_KEY));
      return sum + (isNaN(decryptedMontant) ? 0 : decryptedMontant);
    }, 0);

    const totalHeureNouveaux = heureNouveauxRows.reduce((sum, row) => {
      const decryptedMontant = parseFloat(decryptValue(row.montant, process.env.SECRET_KEY));
      return sum + (isNaN(decryptedMontant) ? 0 : decryptedMontant);
    }, 0);

    // حساب المجموع الكلي
    const totalMontant = math.add(totalAvances, totalHeurs, totalHeureNouveaux);

    // **إرجاع البيانات مع رسالة نجاح**
    res.json({
      message: "تم استرجاع البيانات بنجاح",
      data: {
        totalCandidates: candidates[0].total,
        totalAvances,
        totalHeurs,
        totalHeureNouveaux,
        totalMontant,
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;