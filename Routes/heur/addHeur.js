const express = require('express');
const router = express.Router();
const { pool } = require('../../database');
const crypto = require('crypto');

require('dotenv').config(); // تحميل المتغيرات من .env

// دالة لتشفير القيمة باستخدام createCipheriv
function encryptValue(value, secretKey) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(secretKey, 'salt', 32); // مفتاح بطول 32 بايت
  const iv = crypto.randomBytes(16); // متجه ابتدائي (IV) عشوائي بطول 16 بايت
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`; // إرجاع IV والقيمة المشفرة معًا
}

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

// Endpoint لإضافة بيانات إلى جدول heurs
router.post('/addHeur', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    // الحصول على البيانات من الطلب
    const { candidate_id, montant, responsable, heurs, nome_school, Morningorevening, monitor, date } = req.body;

    // التحقق من وجود الحقول المطلوبة
    if (!candidate_id || !montant || !date) {
      return res.status(400).json({
        message: 'Missing required fields (candidate_id, montant, date)',
      });
    }

    // تشفير montant
    const secretKey = process.env.SECRET_KEY; // يجب أن يكون هذا المفتاح سريًا وآمنًا
    const encryptedMontant = encryptValue(montant.toString(), secretKey);

    // إدخال البيانات في الجدول heurs
    await connection.execute(
      `INSERT INTO heurs (candidate_id, montant, responsable, heurs, monitor, nome_school, Morningorevening, date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        candidate_id,
        encryptedMontant, // استخدام القيمة المشفرة
        responsable || null,
        heurs || null,
        monitor || null,
        nome_school || null,
        Morningorevening || null,
        date,
      ]
    );

    // إرسال إشعار عبر Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('new_heur_added', {
        candidate_id,
        montant: montant, // إرسال القيمة الأصلية (غير مشفرة)
        date,
        responsable,
        nome_school,
        message: 'تم إضافة سجل جديد في جدول الساعات'
      });
    }

    res.status(200).json({ message: "L'enregistrement du Heur a été ajouté avec succès" });
  } catch (err) {
    console.error('Error while adding heur record:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    connection.release(); // إغلاق الاتصال دائمًا
  }
});

// تصدير الـ router
module.exports = router;