const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcryptjs');
  // لإنشاء كلمة مرور عشوائية
const { pool } = require('../../database');

// إعداد مكان تخزين الصور باستخدام multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // مجلد تخزين الصور
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname); // اسم الملف
  },
});

// تهيئة multer
const upload = multer({ storage: storage });

// إضافة مرشح جديد باستخدام POST
router.post('/addinfo', upload.single('image_path'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction(); // بدء المعاملة

    // استخراج البيانات من الطلب
    const {
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
      paiment_total_necessair,
      monitor,
      cap,
      matricule,
      state,
      state_drave,
      number_duserie,
      Informations_du_responsable,
      intervale1 = 5,
      intervale2 = 10,
      intervale3 = 20,
      intervale4 = 30,
      nome_school,
    } = req.body;

    // التحقق من الحقول المطلوبة
    if (!nome || !prenom || !cin || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // التحقق من وجود "cin" مسبقًا في جدول candidates
    const [existingCandidate] = await connection.execute('SELECT * FROM candidates WHERE cin = ?', [cin]);
    if (existingCandidate.length > 0) {
      return res.status(400).json({ message: 'Candidate with this CIN already exists' });
    }

    // تحديد السنة المختصرة (على سبيل المثال 2025 تصبح 25)
    const year = new Date().getFullYear().toString().slice(-2); // الحصول على آخر رقمين من السنة

    // تحديد الرقم التسلسلي التالي
    const [lastSerial] = await connection.execute('SELECT Numéro_desérie_pardéfaut FROM candidates WHERE Numéro_desérie_pardéfaut LIKE ?', [`%/${year}`]);

    // تحديد الرقم التسلسلي التالي بناءً على الرقم الأخير
    const nextSerial = lastSerial.length > 0
      ? parseInt(lastSerial[lastSerial.length - 1].Numéro_desérie_pardéfaut.split('/')[0]) + 1
      : 1; // إذا لم يكن هناك أرقام في السنة الحالية يبدأ من 1

    const newNuméro_desérie_pardéfaut = `${nextSerial}/${year}`;

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // التحقق من رفع الصورة
    const imagePath = req.file ? `uploads/${req.file.filename}` : null;

    // إدخال البيانات إلى جدول candidates
    const [result] = await connection.execute(
      `INSERT INTO candidates (
        nome, prenom, datedinscription, cin, image_path, password, adresse, telephone1, telephone2,
        n_permis, date_dexpiration, info_sub_de_relation, date_dexpiration_permis,
        categorie_domandee, numero_du_permis_de_conduire, valabe_pour_les_categore,
        paiment_total_necessair, monitor, cap, matricule, state, state_drave,
        number_duserie, Numéro_desérie_pardéfaut, Informations_du_responsable,
        intervale1, intervale2, intervale3, intervale4, nome_school
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        nome, prenom, datedinscription, cin, imagePath, hashedPassword, adresse, telephone1, telephone2,
        n_permis, date_dexpiration, info_sub_de_relation, date_dexpiration_permis,
        categorie_domandee, numero_du_permis_de_conduire, valabe_pour_les_categore,
        paiment_total_necessair, monitor, cap, matricule, state, state_drave,
        number_duserie, newNuméro_desérie_pardéfaut, Informations_du_responsable,
        intervale1, intervale2, intervale3, intervale4, nome_school,
      ]
    );

    await connection.commit(); // تأكيد المعاملة

    res.status(201).json({
      message: 'Candidate registered successfully',
      candidateId: result.insertId,
      Numéro_desérie_pardéfaut: newNuméro_desérie_pardéfaut,
      imagePath: imagePath,
    });
  } catch (err) {
    await connection.rollback(); // التراجع عن المعاملة في حالة حدوث خطأ
    console.error('Error while adding candidate:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    connection.release(); // إطلاق الاتصال
  }
});

module.exports = router;
