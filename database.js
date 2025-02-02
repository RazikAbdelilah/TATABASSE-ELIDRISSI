const mysql = require('mysql2/promise');

// إعداد اتصال قاعدة البيانات
const pool = mysql.createPool({
  host: 'localhost', // عنوان الخادم (عادة localhost)
  user: 'root', // اسم مستخدم MySQL
  password: '', // كلمة مرور MySQL
  database: 'systemelidrisi', // اسم قاعدة البيانات
  waitForConnections: true,
  connectionLimit: 100,
  queueLimit: 0,
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
          date_naissance DATE NULL,
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
      

    // إنشاء جدول avances
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS avances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        candidate_id INT NOT NULL,
        montant DECIMAL(10, 2) NOT NULL,
        number_duserie VARCHAR(255) NULL,
        Numéro_desérie_pardéfaut VARCHAR(255) NULL,
        date DATE NOT NULL,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
      );
    `);



    await connection.execute(`
      CREATE TABLE IF NOT EXISTS heurs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        candidate_id INT NOT NULL,
        montant DECIMAL(10, 2) NOT NULL,
        heurs VARCHAR(255) NULL,
        Morningorevening VARCHAR(255) NULL,
        responsable VARCHAR(255) NULL,
        monitor VARCHAR(255) NULL,
        date DATE NOT NULL,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
      );
    `);
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS heure_nouveaux   (
        id INT AUTO_INCREMENT PRIMARY KEY,
        montant DECIMAL(10, 2) NOT NULL,
        heurs VARCHAR(255) NULL,
        Morningorevening VARCHAR(255) NULL,
        responsable VARCHAR(255) NULL,
        monitor VARCHAR(255) NULL,
        date DATE NOT NULL
        
      );
    `);


    await connection.execute(`
     CREATE TABLE IF NOT EXISTS Conduire_la_voiture (
        id INT AUTO_INCREMENT PRIMARY KEY,
        candidate_id INT NOT NULL,
        Conduire_la_voiture TEXT,  
         Nombre_de_temps_de_conduite  VARCHAR(255)  DEFAULT 20 NULL,
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
  number_change_state VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
);
`);
await connection.execute(`
  CREATE TABLE IF NOT EXISTS monitor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255)  NULL, 
    cap VARCHAR(255)  NULL, 
    matricule VARCHAR(255)  NULL, 
    nomeschool VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
  );
  `);
await connection.execute(`
  CREATE TABLE IF NOT EXISTS nomschool  (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nomschool VARCHAR(255)  NULL, 
    cota VARCHAR(255)  NULL, 
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
  apt_exam_theoriqe_1 VARCHAR(255) NULL,
  apt_exam_theoriqe_2 VARCHAR(255) NULL,
  inapt_exam_theoriqe_1 VARCHAR(255) NULL,
  inapt_exam_theoriqe_2 VARCHAR(255) NULL,
  apt_exam_pratiqe_1 VARCHAR(255) NULL,
  apt_exam_pratiqe_2 VARCHAR(255) NULL,
  inapt_exam_pratiqe_1 VARCHAR(255) NULL,
  inapt_exam_pratiqe_2 VARCHAR(255) NULL,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,  -- معرف فريد لكل حجز
    candidate_id INT NOT NULL,  -- معرف المترشح
    date DATE NULL, 
    nome VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    cin VARCHAR(100) NOT NULL,
    state ENUM('provisoire', 'definitif') DEFAULT 'provisoire',  -- الحالة (افتراضيًا 'provisoire')
    school_nomschool VARCHAR(255) NOT NULL,  -- اسم المدرسة
    FOREIGN KEY (candidate_id) REFERENCES candidates(id)  -- ربط بالمترشح (مفترض أن جدول المترشحين يحتوي على حقل id)
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
