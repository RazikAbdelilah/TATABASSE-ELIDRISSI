const express = require('express');
const router = express.Router();
const { pool } = require('../../database');

router.patch('/candidates/:id', async (req, res) => {
    const { id } = req.params;
    const { state } = req.body;

    // التحقق من وجود البيانات المطلوبة
    if (!state || !id) {
        return res.status(400).json({
            error: "Données manquantes",
            details: !id ? "Identifiant du candidat requis" : 'Le champ « état » est obligatoire'
        });
    }

    try {
        // 1. التحقق من وجود المرشح
        const checkQuery = 'SELECT id FROM candidates WHERE id = ?';
        const [checkRows] = await pool.query(checkQuery, [id]);

        if (!checkRows || checkRows.length === 0) {
            return res.status(404).json({ 
                error: "Le candidat n'existe pas",
                details: `Pas de filtre par ID ${id}`
            });
        }

        // 2. تحديث الحالة
        const updateQuery = 'UPDATE candidates SET state = ? WHERE id = ?';
        const [updateResult] = await pool.query(updateQuery, [state, id]);

        // 3. التحقق من نجاح التحديث
        if (updateResult.affectedRows !== 1) {
            return res.status(500).json({
                error: "L'échec de la modernisation",
                details: "Aucun enregistrement n'a été mis à jour"
            });
        }

        // 4. جلب البيانات المحدثة
        const getQuery = 'SELECT id, state FROM candidates WHERE id = ?';
        const [updatedRows] = await pool.query(getQuery, [id]);

        // 5. إرسال الرد النهائي
        res.json({
            success: true,
            message: "Statut mis à jour avec succès",
            data: {
                id: updatedRows[0].id,
                newState: updatedRows[0].state
            }
        });

    } catch (error) {
        console.error("Une erreur s'est produite pendant la mise à jour :", {
            message: error.message,
            stack: error.stack,
            sql: error.sql
        });

        res.status(500).json({
            error: "Erreur du serveur",
            details: error.message,
            sqlError: error.sqlMessage,
            code: error.code
        });
    }
});

module.exports = router;