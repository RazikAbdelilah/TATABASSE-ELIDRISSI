const cron = require('node-cron');
const { pool } = require('./database');

cron.schedule('0 0 * * *', async () => {
  console.log('Running state update task...');
  const connection = await pool.getConnection();

  try {
    // جلب بيانات المرشحين مع آخر دفعة فقط
    const [results] = await connection.execute(`
      SELECT 
        c.id, c.state, c.paiment_total_necessair, 
        COALESCE(a.montant, 0) AS last_payment, a.date AS last_payment_date,
        c.intervale1, c.intervale2, c.intervale3, c.intervale4
      FROM candidates c
      LEFT JOIN avances a 
        ON c.id = a.candidate_id 
        AND a.date = (
          SELECT MAX(date) 
          FROM avances 
          WHERE candidate_id = c.id
        )
    `);

    const today = new Date();

    for (const result of results) {
      const {
        id, state, paiment_total_necessair,
        last_payment, last_payment_date,
        intervale1, intervale2, intervale3, intervale4
      } = result;

      const lastPaymentDate = last_payment_date ? new Date(last_payment_date) : null;
      const daysDiff = lastPaymentDate
        ? Math.floor((today - lastPaymentDate) / (1000 * 60 * 60 * 24))
        : null;

      let newState = state;

      try {
        // حساب النسبة المئوية للدفعة الأخيرة فقط
        const paymentPercentage = paiment_total_necessair > 0
          ? (last_payment / paiment_total_necessair) * 100
          : 0;

        // تحديد الحالة بناءً على النسبة المئوية مع الفترات الزمنية
        if (paymentPercentage >= 70 && paymentPercentage < 100) {
          newState = 'Bon';
        } else if (paymentPercentage >= 50 && paymentPercentage < 70) {
          newState = daysDiff !== null && daysDiff > intervale3 ? 'Pasbon' : 'Bon';
        } else if (paymentPercentage >= 25 && paymentPercentage < 50) {
          newState = daysDiff !== null && daysDiff > intervale2 ? 'Pasbon' : 'Bon';
        } else if (paymentPercentage >= 10 && paymentPercentage < 25) {
          newState = daysDiff !== null && daysDiff > intervale1 ? 'Pasbon' : 'Bon';
        } else if (paymentPercentage >= 0 && paymentPercentage < 10) {
          newState = 'Pasbon';
        }

        // تحديث الحالة في قاعدة البيانات إذا تغيرت
        if (newState !== state) {
          await connection.execute(`
            UPDATE candidates 
            SET state = ? 
            WHERE id = ?
          `, [newState, id]);

          console.log(`Candidate ID: ${id} state updated to: ${newState}`);
        }
      } catch (err) {
        console.error(`Error processing candidate ID: ${id}, Error: ${err.message}`);
      }
    }

    console.log('State update task completed');
  } catch (err) {
    console.error('Error updating states:', err.message);
  } finally {
    connection.release();
  }
});
