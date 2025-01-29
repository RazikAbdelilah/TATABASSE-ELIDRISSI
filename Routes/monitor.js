const express = require('express');
const router = express.Router();  // إضافة هذه السطر لتعريف الـ Router
const { pool } = require('../database');

// إضافة بيانات إلى جدول monitor
router.post('/addmonitor', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { username, cap, matricule, nomeschool } = req.body;

    if (!username || !cap || !matricule) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // إضافة البيانات إلى الجدول
    await connection.execute(
      `INSERT INTO monitor (username, cap, matricule, nomeschool) VALUES (?, ?, ?, ?)`,
      [username, cap, matricule, nomeschool || null]  // إذا كانت nomeschool فارغة، نقوم بوضع null
    );

    res.status(201).json({ message: 'Monitor added successfully' });
  } catch (err) {
    console.error('Error adding monitor:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    connection.release();
  }
});

// جلب البيانات من جدول monitor
router.get('/getmonitors', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    // جلب جميع البيانات من جدول monitor
    const [monitors] = await connection.execute('SELECT * FROM monitor');
    res.status(200).json({ monitors });
  } catch (err) {
    console.error('Error retrieving monitors:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    connection.release();
  }
});


router.post('/updatemonitor', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id, username, cap, matricule, nomeschool } = req.body;

    // التحقق من وجود المعرف (id) والبيانات الأساسية
    if (!id || !username || !cap || !matricule) {
      return res.status(400).json({ message: 'Missing required fields (id, username, cap, matricule)' });
    }

    // تحديث البيانات في جدول monitor بناءً على id
    const [result] = await connection.execute(
      `UPDATE monitor 
       SET username = ?, cap = ?, matricule = ?, nomeschool = ? 
       WHERE id = ?`,
      [username, cap, matricule, nomeschool || null, id]
    );

    // التحقق من ما إذا تم التحديث بنجاح
    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Monitor updated successfully' });
    } else {
      res.status(404).json({ message: 'Monitor not found' });
    }
  } catch (err) {
    console.error('Error updating monitor:', err.message);
    res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
    connection.release();
  }
});


module.exports = router;  // تأكد من تصدير الـ Router
