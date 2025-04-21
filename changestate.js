const cron = require('node-cron');
const { pool } = require('./database');

// دالة تحديث الحالة بناءً على الشروط لكل شخص بمفرده
async function updateStateConditions(candidate_id) {
  const connection = await pool.getConnection();
  try {
    // التحقق من آخر قيمة لـ change_state
    const [changeStateResults] = await connection.execute(`
      SELECT change_state 
      FROM draveng 
      WHERE candidate_id = ? 
      ORDER BY date DESC 
      LIMIT 1
    `, [candidate_id]);

    let newState = 'Bon'; // الحالة الافتراضية

    // إذا كانت القيمة الأخيرة لـ change_state = true، تعيين الحالة مباشرةً إلى Bon
    if (changeStateResults.length > 0 && changeStateResults[0].change_state === 1) {
      newState = 'Bon';
    } else {
      // تحقق من الشروط الأخرى إذا كانت change_state != true

      // جلب آخر 5 قيم لـ state_drave
      const [draveResults] = await connection.execute(`
        SELECT state_drave 
        FROM draveng 
        WHERE candidate_id = ? 
        ORDER BY date DESC 
        LIMIT 5
      `, [candidate_id]);

      // عد القيم التي تساوي false (0) في آخر 5 قيم
      const lastFiveFalseCount = draveResults.filter(drave => drave.state_drave === 0).length;

      // تحقق إذا كانت جميع آخر 5 قيم true
      const lastFiveTrueCount = draveResults.filter(drave => drave.state_drave === 1).length;

      // جلب جميع القيم لـ state_drave للمترشح
      const [allDraveResults] = await connection.execute(`
        SELECT state_drave 
        FROM draveng 
        WHERE candidate_id = ?
      `, [candidate_id]);

      // عد القيم التي تساوي false (0) من جميع القيم
      const totalFalseCount = allDraveResults.filter(drave => drave.state_drave === 0).length;

      // تحقق من الشروط
      if (lastFiveFalseCount === 5 || totalFalseCount >= 6) {
        newState = 'Pasbon';
      } else if (lastFiveTrueCount === 5) {
        newState = 'Bon';
      }
    }

    // تحديث الحالة في جدول candidates
    await connection.execute(`
      UPDATE candidates 
      SET state_drave = ? 
      WHERE id = ?
    `, [newState, candidate_id]);

    console.log(`State for candidate ${candidate_id} updated to: ${newState}`);
  } catch (err) {
    console.error(`Error while updating state for candidate ${candidate_id}:`, err.message);
  } finally {
    connection.release();
  }
}

// جدولة الكود باستخدام node-cron
cron.schedule('0 0 * * *', async () => { // يتم التشغيل كل دقيقة
  const connection = await pool.getConnection();
  try {
    // جلب جميع المترشحين
    const [candidates] = await connection.execute('SELECT id FROM candidates');
    connection.release();

    // معالجة المترشحين بشكل متوازٍ
    await Promise.allSettled(candidates.map(candidate => updateStateConditions(candidate.id)));

    console.log('State update completed for all candidates.');
  } catch (err) {
    console.error('Error during state update for candidates:', err.message);
    connection.release();
  }
});
 