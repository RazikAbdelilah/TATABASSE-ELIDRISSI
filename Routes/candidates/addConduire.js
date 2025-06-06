const express = require("express");
const router = express.Router();
const { pool } = require("../../database");

// 🔹 إضافة أو تحديث بيانات القيادة
router.post("/addOrUpdateConduire/:id", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    console.log("🔹 Received Data:", req.body); // ✅ تحقق من البيانات المستلمة

    const { id } = req.params; // استخدام `id` من `params`
    const { Conduire_la_voiture, Nombre_de_temps_de_conduite } = req.body;

    // ✅ التحقق من القيم المطلوبة
    if (!id || !Conduire_la_voiture) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ تأكد من أن `Conduire_la_voiture` مصفوفة ثم حولها إلى JSON
    let carArrayJson;
    try {
      carArrayJson = JSON.stringify(Array.isArray(Conduire_la_voiture) ? Conduire_la_voiture : []);
    } catch (error) {
      console.error("❌ Error parsing Conduire_la_voiture:", error.message);
      return res.status(400).json({ message: "Invalid Conduire_la_voiture format" });
    }

    const timeToDrive = Nombre_de_temps_de_conduite || "20"; // القيمة الافتراضية 20

    // ✅ تحقق مما إذا كان `candidate_id` موجودًا في الجدول
    await connection.beginTransaction(); // 🔹 استخدم `transaction` للأمان
    const [existingRecord] = await connection.execute(
      "SELECT * FROM conduire_la_voiture WHERE candidate_id = ?", // ✅ اسم الجدول صحيح الآن
      [id]
    );

    if (existingRecord.length > 0) {
      // ✅ تحديث البيانات إذا كانت موجودة
      await connection.execute(
        `UPDATE conduire_la_voiture 
         SET Conduire_la_voiture = ?, Nombre_de_temps_de_conduite = ? 
         WHERE candidate_id = ?`,
        [carArrayJson, timeToDrive, id]
      );
      res.status(200).json({ message: "✅ Data updated successfully" });
    } else {
      // ✅ إضافة بيانات جديدة إذا لم تكن موجودة
      await connection.execute(
        `INSERT INTO conduire_la_voiture (candidate_id, Conduire_la_voiture, Nombre_de_temps_de_conduite) 
         VALUES (?, ?, ?)`,
        [id, carArrayJson, timeToDrive]
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
