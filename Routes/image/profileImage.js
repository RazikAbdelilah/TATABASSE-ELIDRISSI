const express = require('express');
const router = express.Router();
const { pool } = require('../../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

// إعداد multer لتحميل الملفات
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/profiles/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB كحد أقصى
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('يسمح فقط بتحميل الصور'), false);
    }
  }
});

// روت لرفع الصورة
router.post('/:candidate_id', upload.single('profileImage'), async (req, res) => {
  try {
    const { candidate_id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم توفير صورة' });
    }

    const imagePath = req.file.path;
    const imageType = req.file.mimetype;

    // التحقق من وجود المترشح
    const [candidate] = await pool.query(
      'SELECT id FROM candidates WHERE id = ?',
      [candidate_id]
    );

    if (candidate.length === 0) {
      // حذف الملف المرفوع إذا كان المترشح غير موجود
      fs.unlinkSync(imagePath);
      return res.status(404).json({ error: 'المترشح غير موجود' });
    }

    // البحث عن الصورة القديمة إن وجدت
    const [oldImages] = await pool.query(
      'SELECT image_path FROM candidate_profile_images WHERE candidate_id = ?',
      [candidate_id]
    );

    // حذف الصورة القديمة من نظام الملفات إذا كانت موجودة
    if (oldImages.length > 0 && oldImages[0].image_path) {
      try {
        fs.unlinkSync(oldImages[0].image_path);
      } catch (err) {
        console.error('خطأ في حذف الصورة القديمة:', err);
        // يمكنك اختيار ما إذا كنت تريد المتابعة أو إرجاع خطأ هنا
      }
    }

    // إدراج أو تحديث الصورة
    await pool.query(`
      INSERT INTO candidate_profile_images 
        (candidate_id, image_path, image_type)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        image_path = VALUES(image_path),
        image_type = VALUES(image_type)
    `, [candidate_id, imagePath, imageType]);

    res.status(200).json({ 
      message: 'تم حفظ الصورة بنجاح',
      imagePath: imagePath
    });

  } catch (error) {
    console.error('خطأ في معالجة الصورة:', error);
    res.status(500).json({ 
      error: 'حدث خطأ أثناء معالجة الصورة',
      details: error.message
    });
  }
});

module.exports = router;