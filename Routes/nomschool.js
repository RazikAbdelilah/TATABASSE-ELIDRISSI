const express = require('express');
const router = express.Router();
const { pool } = require('../database');






router.post('/addschool', async (req, res) => {
  const { nomschool, number_school, cota } = req.body;

  // التحقق من وجود الحقول المطلوبة
  if (!nomschool || !number_school) {
      return res.status(400).json({ message: 'Missing required fields (nomschool, number_school)' });
  }

  const connection = await pool.getConnection();
  try {
      // إضافة بيانات إلى جدول nomschool
      const [result] = await connection.execute(
          `INSERT INTO nomschool (nomschool, number_school, cota) VALUES (?, ?, ?)`,
          [nomschool, number_school, cota] // تمرير جميع القيم المطلوبة هنا
      );

      res.status(201).json({ message: 'School added successfully', id: result.insertId });
  } catch (err) {
      console.error('Error adding school:', err.message);
      res.status(500).json({ message: 'An error occurred', error: err.message });
  } finally {
      connection.release();
  }
});



  router.get('/getschools', async (req, res) => {
    const connection = await pool.getConnection();
    try {
      // جلب كل البيانات من جدول nomschool
      const [results] = await connection.execute('SELECT * FROM nomschool');
      
      res.status(200).json({ schools: results });
    } catch (err) {
      console.error('Error retrieving schools:', err.message);
      res.status(500).json({ message: 'An error occurred', error: err.message });
    } finally {
      connection.release();
    }
  });


  router.post('/updateschool', async (req, res) => {
    const { id, nomschool, number_school } = req.body;
  
    // التحقق من وجود المعرف والبيانات المدخلة
    if (!id || !nomschool || !number_school) {
      return res.status(400).json({ message: 'Missing required fields (id, nomschool, number_school , cota)' });
    }
  
    const connection = await pool.getConnection();
    try {
      // تحديث البيانات في جدول nomschool بناءً على المعرف
      const [result] = await connection.execute(
        `UPDATE nomschool SET nomschool = ?, number_school = ?, cota = ? WHERE id = ?`, 
        [nomschool, number_school , cota , id]
      );
  
      // التحقق من عدد السجلات المتأثرة
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'School not found with the given id' });
      }
  
      res.status(200).json({ message: 'School updated successfully' });
    } catch (err) {
      console.error('Error updating school:', err.message);
      res.status(500).json({ message: 'An error occurred', error: err.message });
    } finally {
      connection.release();
    }
  });
   
  


  module.exports = router;
  