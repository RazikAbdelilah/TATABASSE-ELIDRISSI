const express = require('express');
const router = express.Router();
const { pool } = require('../../database');

const path = require('path');
const fs = require('fs');

require('dotenv').config();



// روت لجلب الصورة
router.get('/:candidate_id', async (req, res) => {
  try {
    const { candidate_id } = req.params;

    // جلب مسار الصورة من قاعدة البيانات
    const [results] = await pool.query(
      'SELECT image_path, image_type FROM candidate_profile_images WHERE candidate_id = ?',
      [candidate_id]
    );

    if (results.length === 0 || !results[0].image_path) {
      return res.status(404).json({ error: 'لم يتم العثور على صورة لهذا المترشح' });
    }

    const { image_path, image_type } = results[0];
    
    // التحقق من وجود الملف على السيرفر
    if (!fs.existsSync(image_path)) {
      return res.status(404).json({ error: 'الملف غير موجود على السيرفر' });
    }

    // إرسال الصورة كاستجابة
    res.set('Content-Type', image_type);
    res.sendFile(path.resolve(image_path));

  } catch (error) {
    console.error('خطأ في جلب الصورة:', error);
    res.status(500).json({ 
      error: 'حدث خطأ أثناء جلب الصورة',
      details: error.message
    });
  }
});

module.exports = router;