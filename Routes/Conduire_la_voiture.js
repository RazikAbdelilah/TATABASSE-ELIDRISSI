const cron = require('node-cron');
const { pool } = require('../database');

cron.schedule('0 0 * * *', async () => {
  const today = new Date();
  const todayDay = today.toLocaleString('fr-FR', { weekday: 'long' }).toLowerCase();
  const formattedDate = today.toISOString().slice(0, 10);

  const connection = await pool.getConnection();

  try {
    await connection.execute(`DELETE FROM List_of_drivers`);
    
    const [candidates] = await connection.execute(`
      SELECT 
        c.id AS candidate_id, 
        c.nome, 
        c.prenom, 
        c.cin, 
        c.monitor, 
        c.categorie_domandee, 
        c.nome_school,
        cv.Conduire_la_voiture, 
        cv.Nombre_de_temps_de_conduite,
        c.state,
        c.state_drave,
        f.inapt_exam_theoriqe_1,
        f.inapt_exam_theoriqe_2
      FROM candidates c
      JOIN Conduire_la_voiture cv ON c.id = cv.candidate_id
      LEFT JOIN financier_de_letablissement f ON c.id = f.candidate_id
      WHERE c.state NOT IN ('Pasbon', 'pratique')
        AND c.state_drave != 'Pasbon' OR c.state_drave IS NULL
        AND (f.inapt_exam_theoriqe_1 != true OR f.inapt_exam_theoriqe_1 IS NULL)
        AND (f.inapt_exam_theoriqe_2 != true OR f.inapt_exam_theoriqe_2 IS NULL)
    `);

    for (const candidate of candidates) {
      const {
        candidate_id, 
        nome, 
        prenom,
        Conduire_la_voiture, 
        Nombre_de_temps_de_conduite,
        state,
        state_drave
      } = candidate;

      // التحقق من عدد السجلات في draveng
      const [dravengCountResult] = await connection.execute(`
        SELECT COUNT(candidate_id) AS count_in_draveng
        FROM draveng
        WHERE candidate_id = ? AND state_drave = true
      `, [candidate_id]);

      const countInDraveng = dravengCountResult[0].count_in_draveng || 0;
      if (countInDraveng >= Nombre_de_temps_de_conduite) {
        continue;
      }

      // معالجة أيام القيادة
      let days = [];
      try {
        days = JSON.parse(Conduire_la_voiture || '[]');
      } catch (err) {
        console.error(`Erreur JSON pour ${nome} ${prenom}:`, err.message);
        continue;
      }

      if (!Array.isArray(days) || !days.map(d => d.toLowerCase()).includes(todayDay)) {
        continue;
      }

      // إضافة المرشح إذا اجتاز جميع الشروط
      await connection.execute(`
        INSERT INTO List_of_drivers (
          candidate_id, 
          nome, 
          prenom, 
          cin, 
          monitor, 
          categorie_domandee, 
          nome_school, 
          date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        candidate_id,
        candidate.nome,
        candidate.prenom,
        candidate.cin,
        candidate.monitor,
        candidate.categorie_domandee,
        candidate.nome_school,
        formattedDate
      ]);

      console.log(`Candidat ${nome} ${prenom} ajouté avec succès`);
    }
  } catch (err) {
    console.error('Erreur générale:', err.message);
    await connection.rollback();
  } finally {
    connection.release();
  }
});
