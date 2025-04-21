const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../database'); // افترض أن لديك ملف "database.js" يحتوي على إعدادات الاتصال بقاعدة البيانات.

const router = express.Router();

// إضافة مسؤول جديد


router.post('/addresponsable', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { username, password, increased_driving_days, nomeschool, increased_avance_days, number_change_state, admin } = req.body;

    // تحقق من الحقول المطلوبة
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // التحقق من وجود المسؤول مسبقًا باستخدام اسم المستخدم
    const [existingUser] = await connection.execute(
      'SELECT * FROM responsables WHERE username = ?',
      [username]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // إدخال المسؤول الجديد إلى الجدول مع حقل admin
    const [result] = await connection.execute(
      `INSERT INTO responsables (username, password, nomeschool, increased_driving_days, increased_avance_days, number_change_state, admin)
       VALUES (?, ?, ?, ?, ?, ?, ? )`,
      [
        username,
        hashedPassword,
        nomeschool,
        increased_driving_days || false, // القيمة الافتراضية إذا لم يتم إرسالها
        increased_avance_days || false, // القيمة الافتراضية إذا لم يتم إرسالها
        number_change_state || 0, // القيمة الافتراضية إذا لم يتم إرسالها
        admin === true // التأكد من أن admin يكون true أو false فقط
      ]
    );

    res.status(201).json({ message: 'Responsable added successfully', id: result.insertId });
  } catch (err) {
    console.error('Error adding responsable:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    connection.release(); // إغلاق الاتصال دائمًا
  }
});






router.put('/updateresponsable/:id', async (req, res) => {
  const { id } = req.params;
  const {
    username,
    Increased_driving_days,
    Increased_avance_days,
    number_change_state,
    nomeschool
  } = req.body;

  if (!id || !username) {
    return res.status(400).json({ message: 'ID and username are required' });
  }

  const connection = await pool.getConnection();
  try {
    console.log("Received data:", req.body); // DEBUG

    const [existingUser] = await connection.execute(
      'SELECT * FROM responsables WHERE id = ?',
      [id]
    );

    if (existingUser.length === 0) {
      return res.status(404).json({ message: 'Responsable not found' });
    }

    const [updateResult] = await connection.execute(
      `UPDATE responsables
       SET username = ?, 
           Increased_driving_days = ?, 
           Increased_avance_days = ?, 
           number_change_state = ?, 
           nomeschool = ?
       WHERE id = ?`,
      [username, Increased_driving_days, Increased_avance_days, number_change_state, nomeschool, id]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(400).json({ message: 'No changes were made' });
    }

    const [updatedUser] = await connection.execute(
      'SELECT id, username, Increased_driving_days, Increased_avance_days, number_change_state, nomeschool FROM responsables WHERE id = ?',
      [id]
    );

    res.status(200).json({
      message: 'Responsable updated successfully',
      responsable: updatedUser[0]
    });

  } catch (err) {
    console.error('Error updating responsable:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    connection.release();
  }
});











router.get('/responsables', async (req, res) => {
  try {
    const [responsables] = await pool.execute("SELECT * FROM responsables");
    res.status(200).json(responsables);
  } catch (error) {
    console.error("Error fetching responsables:", error);
    res.status(500).json({ message: "Server error" });
  }
});


 






// تسجيل الدخول
// تسجيل الدخول
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
      return res.status(400).json({ message: 'Missing username or password' });
  }

  const connection = await pool.getConnection();
  try {
      // التحقق من اسم المستخدم في قاعدة البيانات
      const [rows] = await connection.execute(
          'SELECT id, username, password, created_at, increased_avance_days, increased_driving_days, admin , nomeschool FROM responsables WHERE username = ?',
          [username]
      );

      if (rows.length === 0) {
          return res.status(401).json({ message: 'Invalid username or password' });
      }

      const responsable = rows[0];

      // التحقق من كلمة المرور باستخدام bcrypt
      const isPasswordValid = await bcrypt.compare(password, responsable.password);
      if (!isPasswordValid) {
          return res.status(401).json({ message: 'Invalid username or password' });
      }

      // إنشاء token باستخدام jsonwebtoken
      const token = jwt.sign(
          { id: responsable.id, username: responsable.username }, // البيانات التي سيتم تخزينها في token
          'your-secret-key', // مفتاح سري لتوقيع token (يجب أن يكون آمنًا ويتم تخزينه في متغيرات البيئة)
          { expiresIn: '10h' } // مدة صلاحية token (ساعة واحدة في هذا المثال)
      );

      // تسجيل الدخول ناجح
      res.status(200).json({
          message: 'Login successful',
          token: token, // إرسال token كجزء من الاستجابة
          user: {
              id: responsable.id,
              username: responsable.username,
              created_at: responsable.created_at,
              increased_avance_days: responsable.increased_avance_days,
              increased_driving_days: responsable.increased_driving_days,
              nomeschool: responsable.nomeschool,
              admin : responsable.admin
          },
      });
  } catch (err) {
      console.error('Error during login:', err.message);
      res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
      connection.release();
  }
});
  




  router.put('/reset-password', async (req, res) => {
    const { id, newPassword } = req.body;
  
    if (!id || !newPassword) {
      return res.status(400).json({ message: 'Missing required fields: id or newPassword' });
    }
  
    const connection = await pool.getConnection();
    try {
      // توليد كلمة مرور جديدة بعد تشفيرها
      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      // تحديث كلمة المرور في قاعدة البيانات
      const [result] = await connection.execute(
        'UPDATE responsables SET password = ? WHERE id = ?',
        [hashedPassword, id]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Responsable not found' });
      }
  
      res.status(200).json({ message: 'Password reset successfully' });
    } catch (err) {
      console.error('Error resetting password:', err.message);
      res.status(500).json({ message: 'An error occurred', error: err.message });
    } finally {
      connection.release();
    }
  });






  router.delete('/deleteresponsable/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { id } = req.params;
  
      // تحقق مما إذا كان id موجودًا
      if (!id) {
        return res.status(400).json({ message: 'Responsable ID is required' });
      }
  
      // التحقق مما إذا كان المسؤول موجودًا قبل الحذف
      const [existingUser] = await connection.execute(
        'SELECT * FROM responsables WHERE id = ?',
        [id]
      );
  
      if (existingUser.length === 0) {
        return res.status(404).json({ message: 'Responsable not found' });
      }
  
      // تنفيذ عملية الحذف
      await connection.execute('DELETE FROM responsables WHERE id = ?', [id]);
  
      res.status(200).json({ message: 'Responsable deleted successfully' });
    } catch (err) {
      // console.error('Error deleting responsable:', err.message);
      res.status(500).json({ message: 'An error occurred', error: err.message });
    } finally {
      connection.release(); // إغلاق الاتصال دائمًا
    }
  });
  
  

module.exports = router;
