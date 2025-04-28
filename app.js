// استيراد المكتبات المطلوبة
const express = require('express');
const http = require('http');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createTables } = require('./database');
const helmet = require('helmet');
const socketIo = require('socket.io');
require('dotenv').config();

// استيراد جميع الروابط كما هي
const candidatesRoutes = require('./Routes/candidates/candidates');
const candidatesplus = require("./Routes/candidates/candidatplus");
const avancesRoutes = require('./Routes/avances');
const drave = require('./Routes/draveng');
const responsables = require('./Routes/responsables');
const logiResponsable = require('./Routes/loginResponsable');
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
const getallAvance = require('./Routes/getallAvance');
const getallderaveng = require('./Routes/getallDraveng')
const getAllData = require('./getAlltada');
const heure_nouveaux = require('./Routes/heure_nouveaux')
const getcandidatinshool = require('./Routes/candidates/getcandidatinshool')
const getheurshool = require('./Routes/getheurshool')
const getdraveng = require('./Routes/getdraveng')
const changestatedraveng = require('./Routes/candidates/changestatedraveng')
const getletablissement = require('./Routes/getletablissement')
const profileImage = require('./Routes/image/profileImage')
const getimage = require('./Routes/image/getimage')
const getjourdecole = require('./Routes/candidates/getjourdecole')
const jourdecole = require('./Routes/candidates/jourdecole')
const note = require('./Routes/note')
const jourdescode = require('./Routes/journnedescode')
// require('./changestate');
// require('./Routes/Conduire_la_voiture')

const server = http.createServer(app);

// إعدادات CORS الموسعة للتطوير والإنتاج
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://crownelidrissi.com',
  'https://www.crownelidrissi.com',
  'ws://localhost:3000',
  'wss://crownelidrissi.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    // السماح لطلبات بدون origin (مثل تطبيقات الهاتف أو curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || 
        origin.endsWith('.crownelidrissi.com')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// إعداد Socket.io مع تحسينات التوافق
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'], // لضمان التوافق مع جميع المتصفحات
  allowEIO3: true // للتوافق مع إصدارات Socket.io القديمة
});

// إعداد Helmet مع CSP معدل
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        ...allowedOrigins,
        "ws://localhost:3000",
        "wss://crownelidrissi.com"
      ],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https://crownelidrissi.com"],
      frameSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// تطبيق CORS
app.use(cors(corsOptions));
app.use(express.json());

// إعدادات Socket.io الإضافية
io.engine.on("initial_headers", (headers, req) => {
  if (req.headers.origin && allowedOrigins.includes(req.headers.origin)) {
    headers["Access-Control-Allow-Origin"] = req.headers.origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
});

io.engine.on("headers", (headers, req) => {
  if (req.headers.origin && allowedOrigins.includes(req.headers.origin)) {
    headers["Access-Control-Allow-Origin"] = req.headers.origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
});

// إرفاق io بـ app لاستخدامه في الروابط
app.set('io', io);

// إعداد اتصالات Socket.io
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', reason);
  });
});

// جميع الروابط المحمية وغير المحمية (كما هي في الكود الأصلي)
app.use('/responsables', authenticateToken, responsables);
app.use('/candidates', authenticateToken, candidatesRoutes);
app.use('/candidatesplus', authenticateToken, candidatesplus);
app.use('/candidates', authenticateToken, updateinfo);
app.use('/candidates', authenticateToken, getallcandidates);
app.use('/candidatesshool', authenticateToken, getcandidatinshool);
app.use('/candidates', authenticateToken, addConduire);
app.use('/avances', authenticateToken, avancesRoutes);
app.use('/avances', authenticateToken, getallAvance);
app.use('/draveng', authenticateToken, drave);
app.use('/draveng', authenticateToken, getallderaveng);
app.use('/nomeschool', authenticateToken, nomeschool);
app.use('/monitor', authenticateToken, monitor);
app.use('/listofdriive', authenticateToken, List_of_drivers);
app.use('/dravengss', authenticateToken, getdraveng);
app.use('/financier', authenticateToken, financier_de_letablissement);
app.use('/financier', authenticateToken, getletablissement);
app.use('/getpdf', authenticateToken, getpdf);
app.use('/api', authenticateToken, driversRoutes);
app.use('/candidates', authenticateToken, resetpassword);
app.use('/heurs', authenticateToken, getAllHeurs);
app.use('/heurs', authenticateToken, getHeursByCandidate);
app.use('/heurs', authenticateToken, addHeur);
app.use('/reservations', authenticateToken, reservations);
app.use('/reservations', authenticateToken, getallreservations);
app.use('/getAllData', authenticateToken, getAllData);
app.use('/heurenouveaux', authenticateToken, heure_nouveaux);
app.use('/heurenouveauxss', authenticateToken, getheurshool);
app.use('/changestatedraveng', authenticateToken, changestatedraveng);
app.use('/getConduire', authenticateToken, getConduire);
app.use('/profileImage', authenticateToken, profileImage);
app.use('/getimage', authenticateToken, getimage);
app.use('/getjourdecole', authenticateToken, getjourdecole);
app.use('/jourdecole', authenticateToken, jourdecole);
app.use('/message' , authenticateToken , note )
app.use('/jour' , authenticateToken , jourdescode )

// Routes غير المحمية
app.use('/logiResponsable', logiResponsable);
app.use('/loginuser', loginuser);

// تشغيل الخادم
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// بدء الخادم وإنشاء الجداول
(async () => {
  await createTables();
})();