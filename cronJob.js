const cron = require('node-cron');
const { pool } = require('./database');

cron.schedule('* * * * *', async () => {
  // console.log('Running state update task...');
  const connection = await pool.getConnection();

  try {
    // جلب بيانات المرشحين مع آخر دفعة فقط
    const [results] = await connection.execute(`
      SELECT 
        c.id, c.state, c.paiment_total_necessair, 
        COALESCE(a.montant, 0) AS last_payment, a.date AS last_payment_date,
        c.intervale1, c.intervale2, c.intervale3, c.intervale4,
        f.apt_exam_theoriqe_1, f.apt_exam_theoriqe_2, f.inapt_exam_theoriqe_1, f.inapt_exam_theoriqe_2,
        f.apt_exam_pratiqe_1, f.apt_exam_pratiqe_2, f.inapt_exam_pratiqe_1, f.inapt_exam_pratiqe_2
      FROM candidates c
      LEFT JOIN avances a 
        ON c.id = a.candidate_id 
        AND a.date = (
          SELECT MAX(date) 
          FROM avances 
          WHERE candidate_id = c.id
        )
      LEFT JOIN financier_de_letablissement f
        ON c.id = f.candidate_id
    `);

    const today = new Date();

    for (const result of results) {
      const {
        id, state, paiment_total_necessair,
        last_payment, last_payment_date,
        intervale1, intervale2, intervale3,
        apt_exam_theoriqe_1, apt_exam_theoriqe_2, inapt_exam_theoriqe_1, inapt_exam_theoriqe_2,
        apt_exam_pratiqe_1, apt_exam_pratiqe_2, inapt_exam_pratiqe_1, inapt_exam_pratiqe_2
      } = result;

      const lastPaymentDate = last_payment_date ? new Date(last_payment_date) : null;
      const daysDiff = lastPaymentDate
        ? Math.floor((today - lastPaymentDate) / (1000 * 60 * 60 * 24))
        : null;

      let newState = state;

      try {
        // التحقق من الأعمدة لضبط الحالة إلى "théorique" أو "pratique"
        if (
          apt_exam_pratiqe_1 || apt_exam_pratiqe_2 || inapt_exam_pratiqe_1 || inapt_exam_pratiqe_2
        ) {
          newState = 'pratique';
        } else if (
          apt_exam_theoriqe_1 || apt_exam_theoriqe_2 || inapt_exam_theoriqe_1 || inapt_exam_theoriqe_2
        ) {
          newState = 'théorique';
        } 
        

        // تحديث الحالة في قاعدة البيانات إذا تغيرت
        if (newState !== state) {
          await connection.execute(`
            UPDATE candidates 
            SET state = ? 
            WHERE id = ?
          `, [newState, id]);

          // console.log(`Candidate ID: ${id} state updated to: ${newState}`);
        }
      } catch (err) {
        // console.error(`Error processing candidate ID: ${id}, Error: ${err.message}`);
      }
    }

    // console.log('State update task completed');
  } catch (err) {
    // console.error('Error updating states:', err.message);
  } finally {
    connection.release();
  }
});
