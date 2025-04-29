const express = require('express');
const router = express.Router();
const { pool } = require('../database');

require('dotenv').config(); // تحميل المتغيرات من .env
const crypto = require('crypto');

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

router.post('/addavance', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { candidate_id, montant, date, responsabl, number_duserie } = req.body;

    // التحقق من الحقول المطلوبة
    if (!candidate_id || !montant || !date) {
      return res.status(400).json({ message: 'Missing required fields (candidate_id, montant, date, number_duserie)' });
    }

    // التحقق من أن montant هو رقم
    if (isNaN(montant) || parseFloat(montant) <= 0) {
      return res.status(400).json({ message: 'montant must be a positive number' });
    }

    // التحقق من صحة التاريخ
    if (!isValidDate(date)) {
      return res.status(400).json({ message: 'Invalid date format (YYYY-MM-DD)' });
    }

    // تشفير montant
    const secretKey = process.env.SECRET_KEY; // يجب أن يكون هذا المفتاح سريًا وآمنًا
    const encryptedMontant = encryptValue(montant.toString(), secretKey);

    // بدء معاملة (Transaction)
    await connection.beginTransaction();

    // الحصول على اسم المدرسة من جدول candidates
    const [candidate] = await connection.execute(
      `SELECT nome_school FROM candidates WHERE id = ?`,
      [candidate_id]
    );

    if (candidate.length === 0) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const nome_school = candidate[0].nome_school;

    // الحصول على السنة الحالية (آخر رقمين)
    const currentYear = new Date().getFullYear().toString().slice(-2);

    // الحصول على آخر رقم تسلسلي لهذه المدرسة في هذه السنة
    const [lastSerial] = await connection.execute(
      `SELECT MAX(CAST(SUBSTRING_INDEX(Numéro_desérie_pardéfaut, '/', 1) AS UNSIGNED)) AS last_serial 
       FROM avances 
       WHERE candidate_id IN (SELECT id FROM candidates WHERE nome_school = ?) 
       AND Numéro_desérie_pardéfaut LIKE ?`,
      [nome_school, `%/${currentYear}`]
    );

    // حساب الرقم التسلسلي الجديد
    const newSerial = (lastSerial[0].last_serial || 0) + 1;
    const Numéro_desérie_pardéfaut = `${newSerial}/${currentYear}`;

    // إضافة الدفعة مع الرقم التسلسلي و number_duserie
    const [result] = await connection.execute(
      `INSERT INTO avances (candidate_id, montant, date, responsabl, number_duserie, Numéro_desérie_pardéfaut, nome_school) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [candidate_id, encryptedMontant, date, responsabl, number_duserie, Numéro_desérie_pardéfaut, nome_school]
    );

    // تأكيد المعاملة
    await connection.commit();

    // فك تشفير montant لإرسال القيمة الحقيقية
    const decryptedMontant = decryptValue(encryptedMontant, secretKey);

    // إرسال إشعار عبر Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('avanceAdded', {
        id: result.insertId,
        candidate_id,
        montant: decryptedMontant, // إرسال القيمة الحقيقية بعد فك التشفير
        date,
        responsabl,
        number_duserie,
        Numéro_desérie_pardéfaut,
        nome_school,
      });
    }

    res.status(201).json({ 
      message: 'Avance added successfully', 
      id: result.insertId, 
      number_duserie,
      Numéro_desérie_pardéfaut,
      nome_school
    });
  } catch (err) {
    // التراجع عن المعاملة في حالة حدوث خطأ
    await connection.rollback();
    console.error('Error while adding avance:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    // إعادة الاتصال إلى المجمع
    connection.release();
  }
});



router.put('/updateavance/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { montant, date } = req.body;

    // التحقق من وجود الحقول المطلوبة
    if (!montant && !date) {
      return res.status(400).json({ message: 'يجب تقديم montant أو date للتحديث' });
    }

    // التحقق من أن montant هو رقم إذا تم تقديمه
    if (montant && (isNaN(montant) || parseFloat(montant) <= 0)) {
      return res.status(400).json({ message: 'montant يجب أن يكون رقمًا موجبًا' });
    }

    // التحقق من صحة التاريخ إذا تم تقديمه
    if (date && !isValidDate(date)) {
      return res.status(400).json({ message: 'صيغة التاريخ غير صالحة (YYYY-MM-DD)' });
    }

    await connection.beginTransaction();

    // الحصول على البيانات الحالية
    const [currentAvance] = await connection.execute(
      `SELECT * FROM avances WHERE id = ?`,
      [id]
    );

    if (currentAvance.length === 0) {
      return res.status(404).json({ message: 'لم يتم العثور على السلفة' });
    }

    // تشفير montant الجديد إذا تم تقديمه
    let encryptedMontant = currentAvance[0].montant;
    if (montant) {
      const secretKey = process.env.SECRET_KEY;
      encryptedMontant = encryptValue(montant.toString(), secretKey);
    }

    // تحديث البيانات
    const [result] = await connection.execute(
      `UPDATE avances 
       SET montant = ?, date = ?
       WHERE id = ?`,
      [
        encryptedMontant,
        date || currentAvance[0].date, // استخدام التاريخ الحالي إذا لم يتم تقديم تاريخ جديد
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'لم يتم العثور على السلفة أو لم يتم تحديث البيانات' });
    }

    await connection.commit();

    // فك تشفير montant لإرسال القيمة الحقيقية
    const secretKey = process.env.SECRET_KEY;
    const decryptedMontant = decryptValue(encryptedMontant, secretKey);

    // إرسال إشعار عبر Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('avanceUpdated', {
        id,
        montant: decryptedMontant,
        date: date || currentAvance[0].date,
      });
    }

    res.status(200).json({ 
      message: 'تم تحديث السلفة بنجاح',
      id,
      montant: decryptedMontant,
      date: date || currentAvance[0].date
    });
  } catch (err) {
    await connection.rollback();
    console.error('حدث خطأ أثناء تحديث السلفة:', err.message);
    res.status(500).json({ message: 'حدث خطأ', error: err.message });
  } finally {
    connection.release();
  }
});

// دالة مساعدة للتحقق من صحة التاريخ
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/; // تنسيق YYYY-MM-DD
  return regex.test(dateString);
}

module.exports = router;