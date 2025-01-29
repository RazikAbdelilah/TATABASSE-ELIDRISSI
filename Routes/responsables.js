const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../database'); // افترض أن لديك ملف "database.js" يحتوي على إعدادات الاتصال بقاعدة البيانات.

const router = express.Router();

// إضافة مسؤول جديد


router.post('/addresponsable', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { username, password, increased_driving_days, increased_avance_days, number_change_state } = req.body;

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

    // إدخال المسؤول الجديد إلى الجدول
    const [result] = await connection.execute(
      `INSERT INTO responsables (username, password, increased_driving_days, increased_avance_days, number_change_state)
       VALUES (?, ?, ?, ?, ?)`,
      [
        username,
        hashedPassword,
        increased_driving_days || false, // القيمة الافتراضية إذا لم يتم إرسالها
        increased_avance_days || false, // القيمة الافتراضية إذا لم يتم إرسالها
        number_change_state || 0 // القيمة الافتراضية إذا لم يتم إرسالها
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





router.put('/updateresponsable', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { username, password, increased_driving_days, increased_avance_days, number_change_state } = req.body;

    // تحقق من الحقول المطلوبة
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    // التحقق من وجود المسؤول مسبقًا باستخدام اسم المستخدم
    const [existingUser] = await connection.execute(
      'SELECT * FROM responsables WHERE username = ?',
      [username]
    );

    if (existingUser.length === 0) {
      return res.status(404).json({ message: 'Username does not exist' });
    }

    // تشفير كلمة المرور إذا تم إرسالها
    let hashedPassword = existingUser[0].password;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // تحديث بيانات المسؤول
    await connection.execute(
      `UPDATE responsables
       SET password = ?, 
           Increased_driving_days = ?, 
           Increased_avance_days = ?, 
           number_change_state = ?
       WHERE username = ?`,
      [
        hashedPassword,
        increased_driving_days !== undefined ? increased_driving_days : existingUser[0].Increased_driving_days,
        increased_avance_days !== undefined ? increased_avance_days : existingUser[0].Increased_avance_days,
        number_change_state !== undefined ? number_change_state : existingUser[0].number_change_state,
        username
      ]
    );

    res.status(200).json({ message: 'Responsable updated successfully' });
  } catch (err) {
    console.error('Error updating responsable:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    connection.release(); // إغلاق الاتصال دائمًا
  }
});











router.get('/getallresponsables', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    // استعلام لجلب جميع المسؤولين من جدول responsables
    const [responsables] = await connection.execute('SELECT * FROM responsables');

    // التحقق من وجود المسؤولين
    if (responsables.length === 0) {
      return res.status(404).json({ message: 'No responsables found' });
    }

    res.status(200).json(responsables);  // إرجاع جميع المسؤولين
  } catch (err) {
    console.error('Error fetching responsables:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    connection.release();
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
        'SELECT id, username, password, created_at, increased_avance_days, increased_driving_days , nomeschool FROM responsables WHERE username = ?',
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
  
      // تسجيل الدخول ناجح
      res.status(200).json({
        message: 'Login successful',
        user: {
          id: responsable.id,
          username: responsable.username,
          created_at: responsable.created_at,
          increased_avance_days: responsable.increased_avance_days,
          increased_driving_days: responsable.increased_driving_days,
          nomeschool: responsable.nomeschool
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
  

module.exports = router;
