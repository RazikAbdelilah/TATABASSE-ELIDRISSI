const cron = require('node-cron');
const { pool } = require('../database');

// جدولة الكود ليعمل يوميًا
cron.schedule('0 0  * * *', async () => {
  console.log('Running daily task to fetch candidates for today...');

  const today = new Date();
  const todayDay = today.toLocaleString('fr-FR', { weekday: 'long' }); // اسم اليوم باللغة الفرنسية
  const formattedDate = today.toISOString().split('T')[0]; // تنسيق التاريخ كـ YYYY-MM-DD

  console.log(`Aujourd'hui est: ${todayDay}`); // طباعة اليوم بالفرنسية

  const connection = await pool.getConnection();

  try {
    // استعلام للبحث عن المترشحين بناءً على اليوم والشروط
    const [candidates] = await connection.execute(`
      SELECT c.id, c.nome, c.prenom, c.cin, c.monitor, c.categorie_domandee, c.nome_school, 
             cv.Conduire_la_voiture, cv.Nombre_de_temps_de_conduite, c.state, c.state_drave, 
             f.la_fin_de_la_formation, f.apt_exam_pratiqe_1, f.inapt_exam_pratiqe_2,
             f.inapt_exam_theoriqe_1, f.inapt_exam_theoriqe_2
      FROM candidates c
      JOIN Conduire_la_voiture cv ON c.id = cv.candidate_id
      LEFT JOIN financier_de_letablissement f ON c.id = f.candidate_id  
      WHERE JSON_CONTAINS(cv.Conduire_la_voiture, JSON_QUOTE(?))
        AND c.state != 'Pasbon'
        AND c.state_drave != 'Pasbon'
        AND (f.la_fin_de_la_formation != true OR f.la_fin_de_la_formation IS NULL)
        AND (f.apt_exam_pratiqe_1 IS NULL OR f.apt_exam_pratiqe_1 NOT IN ('apt'))
        AND (f.inapt_exam_pratiqe_2 IS NULL OR f.inapt_exam_pratiqe_2 NOT IN ('apt', 'inapt'))
    `, [todayDay]);

    console.log(`Candidats pour aujourd'hui:`, candidates);

    for (const candidate of candidates) {
      const { id, nome, prenom, cin, monitor, categorie_domandee, nome_school, Nombre_de_temps_de_conduite, 
              la_fin_de_la_formation, inapt_exam_theoriqe_1, inapt_exam_theoriqe_2, 
              inapt_exam_pratiqe_1, inapt_exam_pratiqe_2 } = candidate;

      // الشرط 1: التحقق من la_fin_de_la_formation
      if (la_fin_de_la_formation === true) {
        console.log(`Le candidat ${nome} ${prenom} a la_fin_de_la_formation = true. Ne sera pas ajouté.`);
        continue; // تجاوز هذا المرشح
      }

      // الشرط 2: التحقق من inapt_exam_theoriqe_1 أو inapt_exam_theoriqe_2
      if (inapt_exam_theoriqe_1 === true || inapt_exam_theoriqe_2 === true) {
        console.log(`Le candidat ${nome} ${prenom} a inapt_exam_theoriqe_1 ou inapt_exam_theoriqe_2 = true. Ne sera pas ajouté.`);
        continue; // تجاوز هذا المرشح
      }

      // الشرط 3: التحقق من inapt_exam_theoriqe_1 أو inapt_exam_theoriqe_2 مع inapt_exam_pratiqe_1 أو inapt_exam_pratiqe_2
      if ((inapt_exam_theoriqe_1 === true || inapt_exam_theoriqe_2 === true) && 
          (inapt_exam_pratiqe_1 === true || inapt_exam_pratiqe_2 === true)) {
        console.log(`Le candidat ${nome} ${prenom} a inapt_exam_theoriqe et inapt_exam_pratiqe = true. Ne sera pas ajouté.`);
        continue; // تجاوز هذا المرشح
      }

      // الشرط 4: التحقق من inapt_exam_theoriqe_1 مع inapt_exam_pratiqe_1 أو inapt_exam_pratiqe_2
      if (inapt_exam_theoriqe_1 === true && 
          (inapt_exam_pratiqe_1 === true || inapt_exam_pratiqe_2 === true)) {
        console.log(`Le candidat ${nome} ${prenom} a inapt_exam_theoriqe_1 et inapt_exam_pratiqe = true. Ne sera pas ajouté.`);
        continue; // تجاوز هذا المرشح
      }

      // الشرط 5: التحقق من inapt_exam_theoriqe_1 مع inapt_exam_pratiqe_1 و inapt_exam_pratiqe_2
      if (inapt_exam_theoriqe_1 === true && 
          inapt_exam_pratiqe_1 === true && inapt_exam_pratiqe_2 === true) {
        console.log(`Le candidat ${nome} ${prenom} a inapt_exam_theoriqe_1 et inapt_exam_pratiqe_1 et inapt_exam_pratiqe_2 = true. Ne sera pas ajouté.`);
        continue; // تجاوز هذا المرشح
      }

      // التحقق من عدد مرات الإدراج السابقة
      const [countResult] = await connection.execute(`
        SELECT COUNT(*) AS count
        FROM List_of_drivers
        WHERE candidate_id = ?
      `, [id]);
      const { count } = countResult[0];

      // التحقق من عدد مرات state_drave = true
      const [stateDraveTrueCount] = await connection.execute(`
        SELECT COUNT(*) AS true_count
        FROM List_of_drivers
        WHERE candidate_id = ? AND state_drave = true
      `, [id]);
      const { true_count } = stateDraveTrueCount[0];

      if (true_count >= Nombre_de_temps_de_conduite) {
        console.log(`Le candidat ${nome} ${prenom} a dépassé le nombre maximum de state_drave = true. Ne sera pas ajouté.`);
        continue; // تجاوز هذا المرشح
      }

      // التحقق من عدد مرات state_drave = false (متفرقة)
      const [stateDraveFalseCount] = await connection.execute(`
        SELECT COUNT(*) AS false_count
        FROM List_of_drivers
        WHERE candidate_id = ? AND state_drave = false
      `, [id]);
      const { false_count } = stateDraveFalseCount[0];

      if (false_count >= 6) {
        console.log(`Le candidat ${nome} ${prenom} a dépassé le nombre maximum de state_drave = false (séparées). Ne sera pas ajouté.`);
        continue; // تجاوز هذا المرشح
      }

      // التحقق من وجود 5 مرات متتالية من state_drave = false
      const [consecutiveFalseCount] = await connection.execute(`
        SELECT COUNT(*) AS consecutive_false_count
        FROM (
          SELECT state_drave, 
                 ROW_NUMBER() OVER (ORDER BY date) - 
                 ROW_NUMBER() OVER (PARTITION BY state_drave ORDER BY date) AS grp
          FROM List_of_drivers
          WHERE candidate_id = ?
        ) AS subquery
        WHERE state_drave = false
        GROUP BY grp
        HAVING COUNT(*) >= 5
      `, [id]);
      const { consecutive_false_count } = consecutiveFalseCount[0] || { consecutive_false_count: 0 };

      if (consecutive_false_count > 0) {
        console.log(`Le candidat ${nome} ${prenom} a dépassé le nombre maximum de state_drave = false (consécutives). Ne sera pas ajouté.`);
        continue; // تجاوز هذا المرشح
      }

      // الشرط الجديد: التحقق من القيمة الأخيرة لـ change_state في جدول draveng
      const [lastChangeState] = await connection.execute(`
        SELECT change_state
        FROM draveng
        WHERE candidate_id = ?
        ORDER BY date DESC
        LIMIT 1
      `, [id]);

      if (lastChangeState.length > 0 && lastChangeState[0].change_state === true) {
        console.log(`Le candidat ${nome} ${prenom} a change_state = true dans la dernière entrée de draveng. Ajout à List_of_drivers.`);

        // إضافة البيانات إلى جدول List_of_drivers
        await connection.execute(`
          INSERT INTO List_of_drivers (candidate_id, nome, prenom, cin, monitor, categorie_domandee, nome_school, date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, nome, prenom, cin, monitor, categorie_domandee, nome_school, formattedDate]);

        console.log(`Le candidat ${nome} ${prenom} a été ajouté à la table List_of_drivers.`);
      } else {
        console.log(`Le candidat ${nome} ${prenom} n'a pas change_state = true dans la dernière entrée de draveng. Ne sera pas ajouté.`);
      }
    }

  } catch (err) {
    console.error('Erreur lors de la récupération des candidats ou de l\'insertion dans List_of_drivers:', err.message);
  } finally {
    connection.release(); // إغلاق الاتصال بقاعدة البيانات
  }
});