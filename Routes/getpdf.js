const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const PDFDocument = require('pdfkit');

router.get('/drivers/pdf', async (req, res) => {
    const { schoolName } = req.query;

    if (!schoolName) {
        return res.status(400).json({ success: false, message: 'School name is required' });
    }

    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // تحويل التاريخ إلى تنسيق YYYY-MM-DD

    const connection = await pool.getConnection();

    try {
        await connection.query("SET NAMES 'utf8mb4'");

        // استعلام لإحضار البيانات حسب المدرسة وتاريخ اليوم
        const [drivers] = await connection.execute(`
            SELECT monitor, nome, prenom, cin 
            FROM List_of_drivers
            WHERE nome_school = ? AND date = ?
        `, [schoolName, formattedDate]);

        if (drivers.length === 0) {
            return res.status(404).json({ success: false, message: 'No data found for this school on this date.' });
        }

        // تنظيم البيانات حسب كل مونيتور
        let monitors = {};
        drivers.forEach(driver => {
            if (!monitors[driver.monitor]) {
                monitors[driver.monitor] = [];
            }
            monitors[driver.monitor].push(`${driver.nome} ${driver.prenom} (CIN: ${driver.cin})`);
        });

        const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'portrait' });
        const filePath = `./${schoolName}_drivers.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filePath}"`);

        doc.pipe(res);

        // عنوان الـ PDF
        doc.fontSize(18).text(`Journée des conducteurs ${schoolName} ${formattedDate}`, { align: 'center' });
        doc.moveDown(1);

        // إعداد الجدول
        const tableTop = doc.y + 20;
        const columnWidth = 200; // عرض العمود
        const rowHeight = 20;
        const margin = 30;

        let x = margin;
        let y = tableTop;

        // رسم الأعمدة وصفوف الجدول
        for (let monitor in monitors) {
            // رسم رأس العمود (اسم المونيتور)
            doc.rect(x, y, columnWidth, rowHeight).stroke(); // رسم الخلية
            doc.font('Helvetica-Bold').fontSize(12).text(monitor, x + 5, y + 5, { width: columnWidth - 10, align: 'center' });

            let startY = y + rowHeight;

            // رسم الأسماء كصفوف
            monitors[monitor].forEach(candidate => {
                doc.rect(x, startY, columnWidth, rowHeight).stroke(); // رسم خلية الاسم
                doc.font('Helvetica').fontSize(10).text(candidate, x + 5, startY + 5, { width: columnWidth - 10, align: 'left' });
                startY += rowHeight;
            });

            // الانتقال إلى العمود التالي
            x += columnWidth;

            // إذا انتهت مساحة الأعمدة في الصفحة
            if (x + columnWidth > doc.page.width - margin) {
                doc.addPage();
                x = margin;
                y = tableTop;
            }
        }

        // إنهاء ملف الـ PDF
        doc.end();

    } catch (err) {
        console.error('Error generating PDF:', err.message);
        res.status(500).json({ success: false, message: 'Error generating PDF' });
    } finally {
        connection.release();
    }
});

module.exports = router;
