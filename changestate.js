const cron = require('node-cron');
const { pool } = require('./database');

// دالة تحديث الحالة بناءً على الشروط
async function updateStateConditions(candidate_id) {
  const connection = await pool.getConnection();
  try {
    // جلب آخر 5 قيم لـ state_drave
    const [draveResults] = await connection.execute(`
      SELECT state_drave 
      FROM draveng 
      WHERE candidate_id = ? 
      ORDER BY date DESC 
      LIMIT 5
    `, [candidate_id]);

    // عد القيم التي تساوي 0
    const falseCount = draveResults.filter(drave => drave.state_drave === 0).length;

    // جلب آخر قيمة لـ change_state
    const [changeStateResults] = await connection.execute(`
      SELECT change_state 
      FROM draveng 
      WHERE candidate_id = ? 
      ORDER BY date DESC 
      LIMIT 1
    `, [candidate_id]);

    let newState = 'Bon'; // الحالة الافتراضية

    // تحقق من شرط آخر 5 قيم لـ state_drave
    if (falseCount === 5) {
      newState = 'Pasbon';
    }

    // تحقق من شرط آخر قيمة لـ change_state
    if (changeStateResults.length > 0) {
      const lastChangeState = changeStateResults[0].change_state;

      if (lastChangeState === 1) {
        newState = 'Bon'; // إذا كانت 1
      } else if (lastChangeState === 0) {
        newState = 'Pasbon'; // إذا كانت 0
      }
    }

    // تحديث الحالة في جدول candidates إذا تغيرت
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
