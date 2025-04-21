const express = require('express');
const router = express.Router();
const { pool } = require('../database');






router.post('/addschool', async (req, res) => {
  const { nomschool, number_school, cota_A, cota_B, cota_C, cota_D, cota_EC } = req.body;

  // التحقق من وجود الحقول المطلوبة
  if (!nomschool || !number_school) {
      return res.status(400).json({ message: 'Missing required fields (nomschool, number_school)' });
  }

  const connection = await pool.getConnection();
  try {
      // إضافة بيانات إلى جدول nomschool
      const [result] = await connection.execute(
          `INSERT INTO nomschool (nomschool, number_school, cota_A, cota_B, cota_C, cota_D, cota_EC) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [nomschool, number_school, cota_A, cota_B, cota_C, cota_D, cota_EC] // تمرير جميع القيم المطلوبة هنا
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


  router.put('/updateschool/:id', async (req, res) => {
    const { id } = req.params;  // الحصول على ID من الرابط
    const { nomschool, number_school, cota_A, cota_B, cota_C, cota_D, cota_EC } = req.body;

    // التحقق من وجود جميع القيم المطلوبة
    if (!id || !nomschool || !number_school) {
        return res.status(400).json({ message: 'الرجاء إدخال جميع البيانات المطلوبة (id, nomschool, number_school)' });
    }

    const connection = await pool.getConnection();
    try {
        // تحديث البيانات في جدول `nomschool` بناءً على `id`
        const [result] = await connection.execute(
            `UPDATE nomschool SET nomschool = ?, number_school = ?, cota_A = ?, cota_B = ?, cota_C = ?, cota_D = ?, cota_EC = ? WHERE id = ?`, 
            [nomschool, number_school, cota_A || 0, cota_B || 0, cota_C || 0, cota_D || 0, cota_EC || 0, id] // وضع `0` كقيمة افتراضية إذا لم يتم إرسال القيم
        );

        // التحقق من عدد السجلات المتأثرة
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'لم يتم العثور على المدرسة بالمعرف المحدد' });
        }

        res.status(200).json({ message: 'تم تحديث بيانات المدرسة بنجاح' });
    } catch (err) {
        console.error('خطأ أثناء تحديث بيانات المدرسة:', err.message);
        res.status(500).json({ message: 'حدث خطأ أثناء التحديث', error: err.message });
    } finally {
        connection.release();
    }
});



  router.delete("/deleteschool/:id", async (req, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection();
  
    try {
      // التحقق من وجود المدرسة قبل الحذف
      const [existingSchool] = await connection.execute(
        "SELECT * FROM nomschool WHERE id = ?",
        [id]
      );
  
      if (existingSchool.length === 0) {
        return res.status(404).json({ message: "School not found" });
      }
  
      // تنفيذ عملية الحذف
      await connection.execute("DELETE FROM nomschool WHERE id = ?", [id]);
  
      res.status(200).json({ message: "School deleted successfully" });
    } catch (err) {
      console.error("Error deleting school:", err.message);
      res.status(500).json({ message: "An error occurred", error: err.message });
    } finally {
      connection.release();
    }
  });
  
   
  


  module.exports = router;
  