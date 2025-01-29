const jwt = require('jsonwebtoken'); // مكتبة JWT
require('dotenv').config(); // تحميل متغيرات البيئة من ملف .env

// مفتاح سري لتوقيع الـ Token (يتم تخزينه في متغير بيئة .env)
const SECRET_KEY = process.env.SECRET_KEY;

// Middleware للتحقق من التوكن
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // استخراج التوكن من الـ Authorization header

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  // التحقق من صحة التوكن
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token.' });
    }

    // طباعة تفاصيل التوكن في الـ console
    console.log('Token is valid:');
    console.log(user); // سيتم طباعة معلومات المستخدم الموجودة في التوكن
    
    req.user = user; // إضافة بيانات المستخدم إلى الطلب
    next(); // الانتقال إلى الـ route التالي
  });
};

module.exports = authenticateToken;
