const mysql = require('mysql2/promise');
require('dotenv').config();

// إعداد اتصال قاعدة البيانات
const pool = mysql.createPool({
  host:  process.env.DB_HOST,
  user:process.env.DB_USER,
  password:process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 100,
  queueLimit: 0,
  charset: 'utf8mb4' // هذا مهم للأحرف العربية
});



// وظيفة لإنشاء الجداول إذا لم تكن موجودة
async function createTables() {
  const connection = await pool.getConnection();
  try {
    // إنشاء جدول candidates
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS candidates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          image_path VARCHAR(255) NULL ,
          prenom VARCHAR(255) NOT NULL,
          datedinscription DATE NULL,
          cin VARCHAR(100) NOT NULL,
          password VARCHAR(255) NOT NULL,
          adresse VARCHAR(255) NULL,
          telephone1 VARCHAR(20) NULL,
          telephone2 VARCHAR(20) NULL,
          n_permis VARCHAR(20) NULL,
          date_dexpiration DATE NULL,
          info_sub_de_relation VARCHAR(255) NULL,
          date_dexpiration_permis DATE NULL,
          date_naissance VARCHAR(255) NULL,
          number_duserie VARCHAR(255) NULL,
          Numéro_desérie_pardéfaut VARCHAR(255) NULL,
          categorie_domandee VARCHAR(255) NULL,
          numero_du_permis_de_conduire VARCHAR(20) NULL,
          valabe_pour_les_categore VARCHAR(255) NULL,
          paiment_total_necessair VARCHAR(255) NULL,
          monitor VARCHAR(255) NULL,
          cap VARCHAR(255) NULL,
          matricule VARCHAR(255) NULL,
          state VARCHAR(255) NULL,
          state_drave VARCHAR(255) NULL,
          Informations_du_responsable VARCHAR(255) NULL,
          intervale1 INT DEFAULT 5 NOT NULL, 
          intervale2 INT DEFAULT 10 NOT NULL, 
          intervale3 INT DEFAULT 20 NOT NULL, 
          intervale4 INT DEFAULT 30 NOT NULL,
          nome_school VARCHAR(255) NULL
          

          
        );
      `);


      // إنشاء جدول صور المترشحين (تخزين المسار فقط)
await connection.execute(`
  CREATE TABLE IF NOT EXISTS candidate_profile_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    candidate_id INT NOT NULL UNIQUE,
    image_path VARCHAR(255) NOT NULL,
    image_type VARCHAR(20) NOT NULL,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
  );
`);

 
      

    // إنشاء جدول avances
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS avances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        candidate_id INT NOT NULL,
        montant VARCHAR(255) NOT NULL,
        number_duserie VARCHAR(255) NULL,
        responsabl VARCHAR(255) NULL,
        Numéro_desérie_pardéfaut VARCHAR(255) NULL,
        nome_school VARCHAR(255) NULL,
        date DATE NOT NULL,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
      );
    `);



    await connection.execute(`
      CREATE TABLE IF NOT EXISTS heurs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        candidate_id INT NOT NULL,
        montant VARCHAR(255) NOT NULL,
        heurs VARCHAR(255) NULL,
        Morningorevening VARCHAR(255) NULL,
        responsable VARCHAR(255) NULL,
        monitor VARCHAR(255) NULL,
        date DATE NOT NULL,
        nome_school VARCHAR(255) NULL,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
      );
    `);
    // بعد إنشاء الجدول مباشرة
await connection.execute(`
  CREATE INDEX IF NOT EXISTS idx_candidate_id ON heurs (candidate_id);
`);
await connection.execute(`
  CREATE INDEX IF NOT EXISTS idx_candidate_date ON heurs (candidate_id, date);
`);
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS heure_nouveaux   (
        id INT AUTO_INCREMENT PRIMARY KEY,
        montant VARCHAR(255) NOT NULL,
        nom  VARCHAR(255) NULL,
        prenom  VARCHAR(255) NULL,
        cin  VARCHAR(255) NULL,
        heurs VARCHAR(255) NULL,
        Morningorevening VARCHAR(255) NULL,
        responsable VARCHAR(255) NULL,
        monitor VARCHAR(255) NULL,
        cap VARCHAR(255) NULL,
        matricule VARCHAR(255) NULL,
        nome_school VARCHAR(255) NULL,
        date DATE NOT NULL
        
      );
    `);


    await connection.execute(`
      CREATE TABLE IF NOT EXISTS conduire_la_voiture (
          id INT AUTO_INCREMENT PRIMARY KEY,                  -- مفتاح أساسي فريد لكل سجل
          candidate_id INT NOT NULL,                         -- معرف المرشح
          Conduire_la_voiture TEXT COLLATE utf8_general_ci,   -- حقل لتخزين بيانات القيادة (نص عادي)
          Nombre_de_temps_de_conduite VARCHAR(255) DEFAULT '20' NULL, -- عدد ساعات القيادة، القيمة الافتراضية 20
          FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE -- العلاقة مع جدول المرشحين
      );
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS jour_ecole (
          id INT AUTO_INCREMENT PRIMARY KEY,                  
          candidate_id INT NOT NULL,                         
          jour_ecole TEXT COLLATE utf8_general_ci,    
          FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE 
      );
    `);
    
  

await connection.execute(`
  CREATE TABLE IF NOT EXISTS draveng (
    id INT AUTO_INCREMENT PRIMARY KEY,
    candidate_id INT NOT NULL,
    Morningorevening VARCHAR(255) NULL,
    commonter VARCHAR(255) NULL,
    responsable VARCHAR(255) NULL,
    state_drave BOOLEAN NULL,
    change_state BOOLEAN DEFAULT FALSE ,
    date DATE NOT NULL,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
  );
`);


await connection.execute(`
CREATE TABLE IF NOT EXISTS responsables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL, 
  password VARCHAR(255) NOT NULL, 
  Increased_driving_days BOOLEAN DEFAULT FALSE , 
  Increased_avance_days BOOLEAN DEFAULT FALSE , 
  nomeschool VARCHAR(255) NULL,
  admin BOOLEAN DEFAULT FALSE ,
  number_change_state VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);
`);

await connection.execute(`
  CREATE TABLE IF NOT EXISTS monitor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, 
    cap VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, 
    matricule VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, 
    nomeschool VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`);


await connection.execute(`
  CREATE TABLE IF NOT EXISTS nomschool  (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nomschool VARCHAR(255)  NULL, 
    cota_A VARCHAR(255)  NULL, 
    cota_B VARCHAR(255)  NULL, 
    cota_C VARCHAR(255)  NULL, 
    cota_D VARCHAR(255)  NULL, 
    cota_EC VARCHAR(255)  NULL, 
    number_school VARCHAR(255)  NULL

  );
  `);
  
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS List_of_drivers  (
      id INT AUTO_INCREMENT PRIMARY KEY,
      candidate_id INT  NULL,
      nome VARCHAR(255)  NULL,
      prenom VARCHAR(255)  NULL,
      monitor VARCHAR(255)  NULL,
      cin VARCHAR(255)  NULL,
      categorie_domandee VARCHAR(255)  NULL,
      nome_school VARCHAR(255)  NULL,
      date DATE NOT NULL,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    );
  `);


  
  await connection.execute(`
CREATE TABLE IF NOT EXISTS financier_de_letablissement  (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT NOT NULL,
  jour_pours_legaliser BOOLEAN DEFAULT FALSE,
  exam_medical BOOLEAN DEFAULT FALSE,
  frais_de_timbre BOOLEAN DEFAULT FALSE,
  la_fin_de_la_formation BOOLEAN DEFAULT FALSE,
  les_devoirs_finaancier_de_letablissement BOOLEAN DEFAULT FALSE,
  exam_theoriqe_1 DATE NULL,
  exam_theoriqe_2 DATE NULL,
  exam_pratiqe_1 DATE NULL,
  exam_pratiqe_2 DATE NULL,
  examen_exceptionnel DATE NULL,
  apt_exam_theoriqe_1 BOOLEAN DEFAULT FALSE,
  apt_exam_theoriqe_2 BOOLEAN DEFAULT FALSE,
  inapt_exam_theoriqe_1 BOOLEAN DEFAULT FALSE,
  inapt_exam_theoriqe_2 BOOLEAN DEFAULT FALSE,
  apt_exam_pratiqe_1 BOOLEAN DEFAULT FALSE,
  apt_exam_pratiqe_2 BOOLEAN DEFAULT FALSE,
  inapt_exam_pratiqe_1 BOOLEAN DEFAULT FALSE,
  inapt_exam_pratiqe_2 BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,  
    candidate_id INT NOT NULL, 
    month DATE NULL, 
    nome VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    cin VARCHAR(100) NOT NULL,
    state ENUM('provisoire', 'definitif') DEFAULT 'provisoire', 
    school_nomschool VARCHAR(255) NOT NULL,  
    categorie_domandee VARCHAR(255) NOT NULL,  
    FOREIGN KEY (candidate_id) REFERENCES candidates(id) 
);
    `);



    await connection.execute(`
      CREATE TABLE IF NOT EXISTS messags (
      id INT AUTO_INCREMENT PRIMARY KEY,  
      candidate_id INT NOT NULL,
      note BOOLEAN DEFAULT FALSE,  
      message VARCHAR(255)  NULL, 
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) 
  );
      `);




    await connection.execute(`

 CREATE TABLE IF NOT EXISTS active_sessions (
    user_id INT PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES responsables(id) ON DELETE CASCADE
);
      `);


      await connection.execute(`
        CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    username VARCHAR(255) NOT NULL,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (ip_address),
    INDEX (username)
);
        
        `);


    

    console.log('Tables created or already exist');
  } catch (err) {
    console.error('Error while creating tables:', err.message);
  } finally {
    connection.release();
  }
}

// تصدير اتصال قاعدة البيانات ووظيفة إنشاء الجداول
module.exports = {
  pool,
  createTables,
};
