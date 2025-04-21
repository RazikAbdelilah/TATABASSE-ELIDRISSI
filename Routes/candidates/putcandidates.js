const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();
const { pool } = require('../../database');

const SERVER_URL = process.env.SERVER_URL  // 🔹 تأكد من ضبطه حسب بيئتك

// إعداد multer لتخزين الصور في مجلد `uploads/candidates`
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/candidates/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

router.put('/updateinfo/:id', upload.single('image_path'), async (req, res) => {
  const connection = await pool.getConnection();
  const { id } = req.params;
  const {
    nome,
    prenom,
    datedinscription,
    date_naissance,  // ✅ إضافة حقل تاريخ الميلاد هنا
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
    Numéro_desérie_pardéfaut,
    Informations_du_responsable,
    intervale1 = 5,
    intervale2 = 10,
    intervale3 = 20,
    intervale4 = 30,
    nome_school,
  } = req.body;

  try {
    await connection.beginTransaction(); // بدء المعاملة

    // التحقق مما إذا كان هناك صورة جديدة مرفوعة
    let imagePath = null;
    if (req.file) {
      imagePath = `${SERVER_URL}/uploads/candidates/${req.file.filename}`;
    }

    // تشفير كلمة المرور الجديدة إذا تم إرسالها
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // بناء استعلام التحديث ديناميكيًا بحيث لا يتم تحديث الحقول غير المرسلة
    let updateQuery = `UPDATE candidates SET `;
    let updateParams = [];

    if (nome) { updateQuery += `nome = ?, `; updateParams.push(nome); }
    if (prenom) { updateQuery += `prenom = ?, `; updateParams.push(prenom); }
    if (datedinscription) { updateQuery += `datedinscription = ?, `; updateParams.push(datedinscription); }
    if (date_naissance) { updateQuery += `date_naissance = ?, `; updateParams.push(date_naissance); } // ✅ إضافة تحديث `date_naissance`
    if (cin) { updateQuery += `cin = ?, `; updateParams.push(cin); }
    if (hashedPassword) { updateQuery += `password = ?, `; updateParams.push(hashedPassword); }
    if (adresse) { updateQuery += `adresse = ?, `; updateParams.push(adresse); }
    if (telephone1) { updateQuery += `telephone1 = ?, `; updateParams.push(telephone1); }
    if (telephone2) { updateQuery += `telephone2 = ?, `; updateParams.push(telephone2); }
    if (n_permis) { updateQuery += `n_permis = ?, `; updateParams.push(n_permis); }
    if (date_dexpiration) { updateQuery += `date_dexpiration = ?, `; updateParams.push(date_dexpiration); }
    if (info_sub_de_relation) { updateQuery += `info_sub_de_relation = ?, `; updateParams.push(info_sub_de_relation); }
    if (date_dexpiration_permis) { updateQuery += `date_dexpiration_permis = ?, `; updateParams.push(date_dexpiration_permis); }
    if (categorie_domandee) { updateQuery += `categorie_domandee = ?, `; updateParams.push(categorie_domandee); }
    if (numero_du_permis_de_conduire) { updateQuery += `numero_du_permis_de_conduire = ?, `; updateParams.push(numero_du_permis_de_conduire); }
    if (valabe_pour_les_categore) { updateQuery += `valabe_pour_les_categore = ?, `; updateParams.push(valabe_pour_les_categore); }
    if (paiment_total_necessair) { updateQuery += `paiment_total_necessair = ?, `; updateParams.push(paiment_total_necessair); }
    if (monitor) { updateQuery += `monitor = ?, `; updateParams.push(monitor); }
    if (cap) { updateQuery += `cap = ?, `; updateParams.push(cap); }
    if (matricule) { updateQuery += `matricule = ?, `; updateParams.push(matricule); }
    if (state) { updateQuery += `state = ?, `; updateParams.push(state); }
    if (state_drave) { updateQuery += `state_drave = ?, `; updateParams.push(state_drave); }
    if (number_duserie) { updateQuery += `number_duserie = ?, `; updateParams.push(number_duserie); }
    if (Numéro_desérie_pardéfaut) { updateQuery += `Numéro_desérie_pardéfaut = ?, `; updateParams.push(Numéro_desérie_pardéfaut); }
    if (Informations_du_responsable) { updateQuery += `Informations_du_responsable = ?, `; updateParams.push(Informations_du_responsable); }
    if (intervale1) { updateQuery += `intervale1 = ?, `; updateParams.push(intervale1); }
    if (intervale2) { updateQuery += `intervale2 = ?, `; updateParams.push(intervale2); }
    if (intervale3) { updateQuery += `intervale3 = ?, `; updateParams.push(intervale3); }
    if (intervale4) { updateQuery += `intervale4 = ?, `; updateParams.push(intervale4); }
    if (nome_school) { updateQuery += `nome_school = ?, `; updateParams.push(nome_school); }
    if (imagePath) { updateQuery += `image_path = ?, `; updateParams.push(imagePath); }

    // إزالة الفاصلة الأخيرة وإضافة الشرط
    updateQuery = updateQuery.slice(0, -2) + ` WHERE id = ?`;
    updateParams.push(id);

    const [result] = await connection.execute(updateQuery, updateParams);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    await connection.commit();

    res.status(200).json({
      message: 'Candidate information updated successfully',
      imagePath: imagePath || "No new image uploaded",
    });
  } catch (err) {
    await connection.rollback();
    console.error('Error while updating candidate:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    connection.release();
  }
});

router.use('/uploads', express.static('uploads'));

module.exports = router;
