const express = require("express");
const router = express.Router();
const { pool } = require("../../database");

// 🔹 إضافة أو تحديث بيانات يوم المدرسة
router.post("/addOrUpdateJourEcole/:id", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    console.log("🔹 Received Data:", req.body); // ✅ تحقق من البيانات المستلمة

    const { id } = req.params; // استخدام `id` من `params`
    const { jour_ecole } = req.body; // تم تغيير الاسم من Conduire_la_voiture إلى jour_ecole

    // ✅ التحقق من القيم المطلوبة
    if (!id || !jour_ecole) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ تأكد من أن `jour_ecole` مصفوفة ثم حولها إلى JSON
    let jourEcoleJson;
    try {
      jourEcoleJson = JSON.stringify(Array.isArray(jour_ecole) ? jour_ecole : []);
    } catch (error) {
      console.error("❌ Error parsing jour_ecole:", error.message);
      return res.status(400).json({ message: "Invalid jour_ecole format" });
    }

    // ✅ تحقق مما إذا كان `candidate_id` موجودًا في الجدول
    await connection.beginTransaction(); // 🔹 استخدم `transaction` للأمان
    const [existingRecord] = await connection.execute(
      "SELECT * FROM jour_ecole WHERE candidate_id = ?",
      [id]
    );

    if (existingRecord.length > 0) {
      // ✅ تحديث البيانات إذا كانت موجودة
      await connection.execute(
        `UPDATE jour_ecole 
         SET jour_ecole = ?
         WHERE candidate_id = ?`,
        [jourEcoleJson, id]
      );
      res.status(200).json({ message: "✅ Data updated successfully" });
    } else {
      // ✅ إضافة بيانات جديدة إذا لم تكن موجودة
      await connection.execute(
        `INSERT INTO jour_ecole (candidate_id, jour_ecole) 
         VALUES (?, ?)`,
        [id, jourEcoleJson]
      );
      res.status(201).json({ message: "✅ Data inserted successfully" });
    }

    await connection.commit(); // ✅ تأكيد `transaction`
  } catch (err) {
    await connection.rollback(); // ❌ إلغاء `transaction` في حالة الفشل
    console.error("❌ Error handling data:", err.message);
    res.status(500).json({ message: "An error occurred", error: err.message });
  } finally {
    connection.release(); // ✅ تحرير الاتصال بقاعدة البيانات
  }
});

module.exports = router;