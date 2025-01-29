const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');  // لإنشاء كلمة مرور عشوائية
const { pool } = require('../../database');







// نقطة النهاية لإعادة تعيين كلمة المرور
router.post('/resetpassword', async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const { cin } = req.body;
  
      // التحقق من أن CIN موجود
      if (!cin) {
        return res.status(400).json({ message: 'CIN is required' });
      }
  
      // جلب العميل بناءً على CIN
      const [rows] = await connection.execute(
        'SELECT * FROM candidates WHERE cin = ?',
        [cin]
      );
  
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Candidate not found' });
      }
  
      // إنشاء كلمة مرور جديدة عشوائية
      const newPassword = crypto.randomBytes(8).toString('hex');  // توليد كلمة مرور عشوائية 16 حرف
  
      // تشفير كلمة المرور الجديدة
      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      // تحديث كلمة المرور في قاعدة البيانات
      await connection.execute(
        'UPDATE candidates SET password = ? WHERE cin = ?',
        [hashedPassword, cin]
      );
  
      // إرسال كلمة المرور الجديدة للعميل (يمكنك إرسالها عبر البريد الإلكتروني أو واجهة المستخدم)
      res.status(200).json({ message: 'Password reset successfully', newPassword: newPassword });
  
    } catch (err) {
      console.error('Error resetting password:', err.message);
      res.status(500).json({ message: 'An error occurred', error: err.message });
    } finally {
      connection.release();
    }
  });


  
module.exports = router;