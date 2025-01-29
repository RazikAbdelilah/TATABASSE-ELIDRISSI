// استيراد المكتبات المطلوبة
const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken'); // مكتبة لإنشاء والتحقق من الـ Token
const { createTables } = require('./database');
const candidatesRoutes = require('./Routes/candidates/candidates');
const avancesRoutes = require('./Routes/avances');
const drave = require('./Routes/draveng');
const responsables = require('./Routes/responsables');
const nomeschool = require('./Routes/nomschool');
const monitor = require('./Routes/monitor');
const List_of_drivers = require('./Routes/List_of_drivers');
const financier_de_letablissement = require('./Routes/financier_de_letablissement');
const getpdf = require('./Routes/getpdf');
const driversRoutes = require('./Routes/drivers');
const updateinfo = require('./Routes/candidates/putcandidates');
const getallcandidates = require('./Routes/candidates/getallcandidates');
const addConduire = require('./Routes/candidates/addConduire');
const getConduire = require('./Routes/candidates/getConduire');
const resetpassword = require('./Routes/candidates/resetpassword');
const loginuser = require('./Routes/candidates/loginuser');
const authenticateToken = require('./middleware/authenticateToken');
const getAllHeurs = require('./Routes/heur/getAllHeurs');
const getHeursByCandidate = require('./Routes/heur/getHeursByCandidate');
const addHeur = require('./Routes/heur/addHeur');
const reservations = require('./Routes/reservations/reservations');
const getallreservations = require('./Routes/reservations/getAllReservations');
require('./cronJob');
require('./changestate');
require('dotenv').config(); // استيراد dotenv لتحميل متغيرات البيئة

const helmet = require('helmet');
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    connectSrc: ["'self'", 'https://abdelilahrazik.com'],
  },
}));

// تعريف المنفذ
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(cors());




app.use('/loginuser', loginuser);
// تطبيق Middleware على جميع الـ Routes (باستثناء /login)
// app.use('/candidates', authenticateToken);

// Routes
app.use('/candidates', candidatesRoutes);
app.use('/candidates', updateinfo);
app.use('/candidates', getallcandidates);
app.use('/avances', avancesRoutes);
app.use('/draveng', drave);
app.use('/responsables', responsables);
app.use('/nomeschool', nomeschool);
app.use('/monitor', monitor);
app.use('/listofdriive', List_of_drivers);
app.use('/financier', financier_de_letablissement);
app.use('/getpdf', getpdf);
app.use('/api', driversRoutes);
app.use('/candidates', resetpassword);
app.use('/heurs' , getAllHeurs);
app.use('/heurs' , getHeursByCandidate);
app.use('/heurs' , addHeur);
app.use('/reservations', reservations);
app.use('/reservations', getallreservations); 


// تشغيل الخادم
app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});

// بدء الخادم وإنشاء الجداول
(async () => {
  await createTables();
})();
