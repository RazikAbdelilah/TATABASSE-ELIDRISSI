const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../../database');

// مفتاح سري لتوقيع الـ Token
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key_here'; // استخدم متغيرات البيئة لمفتاح الأمان

// مسار تسجيل الدخول
router.post('/login', async (req, res) => {
  const { cin, password } = req.body;

  if (!cin || !password) {
    return res.status(400).json({ message: 'CIN and password are required' });
  }

  const connection = await pool.getConnection();
  try {
    // التحقق من وجود المستخدم باستخدام CIN
    const [candidate] = await connection.execute('SELECT * FROM candidates WHERE cin = ?', [cin]);
    if (candidate.length === 0) {
      return res.status(400).json({ message: 'Invalid CIN or password' });
    }

    // مقارنة كلمة المرور المدخلة مع كلمة المرور المخزنة
    const isMatch = await bcrypt.compare(password, candidate[0].password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid CIN or password' });
    }

    // إنشاء التوكن
    const token = jwt.sign(
      {
        id: candidate[0].id,
        cin: candidate[0].cin,
        role: 'candidate', // إضافة دور المستخدم
      },
      SECRET_KEY,
      { expiresIn: '24h' } // صلاحية التوكن لمدة 24 ساعة
    );

    // إرسال الرد مع الـ Token وبيانات المستخدم
    res.status(200).json({
      message: 'Login successful',
      token, // إرسال التوكن
      user: {
        id: candidate[0].id,
        nome: candidate[0].nome,
        prenom: candidate[0].prenom,
        cin: candidate[0].cin,
        datedinscription: candidate[0].datedinscription,
        infosubserelation: candidate[0].infosubserelation,
        datedexpirationpermis: candidate[0].datedexpirationpermis,
      },
    });

  } catch (err) {
    console.error('Error during login:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
