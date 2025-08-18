const { Pool, types } = require('pg');
const bcrypt = require('bcryptjs');

// Conditional pool configuration for Render.com compatibility
let pool;
if (process.env.DATABASE_URL) {
  // Production environment (like Render) where DATABASE_URL is available
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  // Local development environment using .env variables (PGHOST, PGUSER, etc.)
  pool = new Pool();
}

const ROLE_TEMPLATES = [
    {
        name: 'Administrateur Principal',
        permissionKeys: ['student:read', 'student:create', 'student:update', 'student:delete', 'student:archive', 'enrollment:create', 'enrollment:update_class', 'enrollment:update_payment', 'report:financial', 'report:attendance', 'report_card:generate', 'grade:read', 'grade:create', 'appreciation:create', 'student_portal:manage_access', 'student_portal:manage_accounts', 'settings:manage_academic', 'settings:manage_teachers', 'settings:manage_timetable', 'user:manage', 'role:manage']
    },
    {
        name: 'Directeur des Opérations',
        permissionKeys: ['student:read', 'student:create', 'student:update', 'student:delete', 'student:archive', 'enrollment:create', 'enrollment:update_class', 'enrollment:update_payment', 'report:financial', 'report:attendance', 'report_card:generate', 'grade:read', 'grade:create', 'appreciation:create', 'student_portal:manage_access', 'student_portal:manage_accounts', 'settings:manage_teachers', 'settings:manage_timetable']
    },
    {
        name: 'Secrétaire Pédagogique',
        permissionKeys: ['student:read', 'student:create', 'student:update', 'student:delete', 'student:archive', 'enrollment:create', 'enrollment:update_class', 'enrollment:update_payment', 'report:financial', 'report:attendance', 'report_card:generate', 'grade:read', 'appreciation:create', 'student_portal:manage_access', 'student_portal:manage_accounts', 'settings:manage_teachers', 'settings:manage_timetable']
    },
    {
        name: 'Comptable / Gestionnaire des Paiements',
        permissionKeys: ['student:read', 'enrollment:update_payment', 'report:financial', 'student_portal:manage_access']
    },
     {
        name: 'Gestionnaire des Professeurs',
        permissionKeys: ['settings:manage_teachers']
    },
    {
        name: 'Gestionnaire d\'Emploi du Temps',
        permissionKeys: ['settings:manage_timetable']
    },
    {
        name: 'Gestionnaire du Portail Élève',
        permissionKeys: ['student:read', 'student_portal:manage_accounts']
    },
];


// --- Helper Functions ---

// Checks if a table exists in the current schema.
async function tableExists(client, tableName) {
    const res = await client.query(`
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = $1
    `, [tableName]);
    return res.rowCount > 0;
}

// Checks if a column exists in a given table.
async function columnExists(client, tableName, columnName) {
    const res = await client.query(`
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
    `, [tableName, columnName]);
    return res.rowCount > 0;
}

// Checks if a constraint exists.
async function constraintExists(client, constraintName) {
    const res = await client.query(`
        SELECT 1 FROM pg_constraint WHERE conname = $1
    `, [constraintName]);
    return res.rowCount > 0;
}


// --- Main Setup and Migration Logic ---

async function setup() {
    const client = await pool.connect();
    try {
        console.log("Connexion à PostgreSQL réussie. Initialisation de la base de données...");

        await client.query('BEGIN');

        // --- Step 1: Create Core Tables (if they don't exist) ---
        
        await client.query(`
          CREATE TABLE IF NOT EXISTS instances (
              id SERIAL PRIMARY KEY,
              name TEXT NOT NULL,
              address TEXT,
              phone TEXT,
              email TEXT,
              logo_url TEXT,
              passing_grade NUMERIC(5, 2),
              status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
              expires_at TIMESTAMPTZ
          );
        `);

        if (!await columnExists(client, 'instances', 'expires_at')) {
            console.log("Migration: Ajout de 'expires_at' à la table 'instances'.");
            await client.query('ALTER TABLE instances ADD COLUMN expires_at TIMESTAMPTZ');
        }

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'standard',
                teacher_id INTEGER
            );
        `);

        // --- Step 2: Handle Migration from single-tenant (school_info) to multi-tenant (instances) ---
        
        let defaultInstanceId = 1;
        if (await tableExists(client, 'school_info')) {
            console.log("Ancienne table 'school_info' détectée. Lancement de la migration...");
            
            const { rows: instanceRows } = await client.query('SELECT * FROM instances LIMIT 1');
            if (instanceRows.length === 0) {
                const { rows: oldInfo } = await client.query('SELECT * FROM school_info WHERE id = 1');
                if (oldInfo.length > 0) {
                    const { name, address, phone, email, logo_url, passing_grade } = oldInfo[0];
                    const { rows: newInstanceRows } = await client.query(
                        `INSERT INTO instances (name, address, phone, email, logo_url, passing_grade) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                        [name, address, phone, email, logo_url, passing_grade]
                    );
                    defaultInstanceId = newInstanceRows[0].id;
                    console.log(`Données de 'school_info' migrées vers l'instance ID: ${defaultInstanceId}.`);
                }
            } else {
                defaultInstanceId = instanceRows[0].id;
            }
           
            await client.query('DROP TABLE school_info');
            console.log("Table 'school_info' supprimée.");
        }
        
        // --- Step 3: Create remaining tables from original schema ---
        await client.query(`
            CREATE TABLE IF NOT EXISTS students ( id VARCHAR(255) PRIMARY KEY, nom TEXT NOT NULL, prenom TEXT NOT NULL, date_of_birth DATE, address TEXT, photo_url TEXT, tutor_name TEXT, tutor_phone TEXT, tutor_email TEXT, medical_notes TEXT, status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')), classe_ref TEXT );
            CREATE TABLE IF NOT EXISTS school_years ( id SERIAL PRIMARY KEY, name TEXT NOT NULL, is_current BOOLEAN NOT NULL DEFAULT false );
            CREATE TABLE IF NOT EXISTS academic_periods ( id SERIAL PRIMARY KEY, year_id INTEGER NOT NULL REFERENCES school_years(id) ON DELETE CASCADE, name TEXT NOT NULL, UNIQUE(year_id, name) );
            CREATE TABLE IF NOT EXISTS subjects ( id SERIAL PRIMARY KEY, name TEXT NOT NULL );
            CREATE TABLE IF NOT EXISTS enrollments ( id SERIAL PRIMARY KEY, student_id VARCHAR(255) NOT NULL REFERENCES students(id) ON DELETE CASCADE, year_id INTEGER NOT NULL REFERENCES school_years(id) ON DELETE CASCADE, "className" TEXT NOT NULL, mppa NUMERIC(10, 2) NOT NULL, payments JSONB NOT NULL, grades_access_enabled BOOLEAN NOT NULL DEFAULT true, adjustments JSONB NOT NULL DEFAULT '[]'::jsonb, UNIQUE(student_id, year_id) );
            CREATE TABLE IF NOT EXISTS class_subjects ( id SERIAL PRIMARY KEY, class_name TEXT NOT NULL, subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE, year_id INTEGER NOT NULL REFERENCES school_years(id) ON DELETE CASCADE, max_grade NUMERIC(10, 2) NOT NULL DEFAULT 100, UNIQUE(class_name, subject_id, year_id) );
            CREATE TABLE IF NOT EXISTS teachers ( id SERIAL PRIMARY KEY, nom TEXT NOT NULL, prenom TEXT NOT NULL, email TEXT, phone TEXT, user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE );
            CREATE TABLE IF NOT EXISTS grades ( id SERIAL PRIMARY KEY, enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE, subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE, period_id INTEGER NOT NULL REFERENCES academic_periods(id) ON DELETE CASCADE, evaluation_name TEXT NOT NULL, score NUMERIC(10, 2) NOT NULL, max_score NUMERIC(10, 2) NOT NULL, date DATE NOT NULL );
            CREATE TABLE IF NOT EXISTS appreciations ( id SERIAL PRIMARY KEY, enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE, subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE, period_id INTEGER NOT NULL REFERENCES academic_periods(id) ON DELETE CASCADE, text TEXT NOT NULL, UNIQUE(enrollment_id, subject_id, period_id) );
            CREATE TABLE IF NOT EXISTS general_appreciations ( id SERIAL PRIMARY KEY, enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE, period_id INTEGER NOT NULL REFERENCES academic_periods(id) ON DELETE CASCADE, text TEXT NOT NULL, UNIQUE(enrollment_id, period_id) );
            CREATE TABLE IF NOT EXISTS teacher_assignments ( id SERIAL PRIMARY KEY, teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE, class_name TEXT NOT NULL, subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE, year_id INTEGER NOT NULL REFERENCES school_years(id) ON DELETE CASCADE, UNIQUE(teacher_id, class_name, subject_id, year_id) );
            CREATE TABLE IF NOT EXISTS attendance ( id SERIAL PRIMARY KEY, enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE, date DATE NOT NULL, status VARCHAR(10) NOT NULL CHECK(status IN ('present', 'absent', 'late')), subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE, teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE, UNIQUE(enrollment_id, date, subject_id) );
            CREATE TABLE IF NOT EXISTS audit_logs ( id SERIAL PRIMARY KEY, timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, username TEXT NOT NULL, action_type TEXT NOT NULL, target_id TEXT, target_name TEXT, details JSONB );
            CREATE TABLE IF NOT EXISTS locations ( id SERIAL PRIMARY KEY, name TEXT NOT NULL, capacity INTEGER );
            CREATE TABLE IF NOT EXISTS schedule_slots ( id SERIAL PRIMARY KEY, assignment_id INTEGER NOT NULL REFERENCES teacher_assignments(id) ON DELETE CASCADE, day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 1 AND 7), start_time TIME NOT NULL, end_time TIME NOT NULL, location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL );
            CREATE TABLE IF NOT EXISTS student_users ( id SERIAL PRIMARY KEY, student_id VARCHAR(255) NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'active' );
            CREATE TABLE IF NOT EXISTS resources ( id SERIAL PRIMARY KEY, assignment_id INTEGER NOT NULL REFERENCES teacher_assignments(id) ON DELETE CASCADE, resource_type VARCHAR(10) NOT NULL CHECK(resource_type IN ('file', 'link')), title TEXT NOT NULL, url TEXT, file_name TEXT, mime_type TEXT, file_content TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP );
            CREATE TABLE IF NOT EXISTS announcements ( id SERIAL PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP );
            
            CREATE TABLE IF NOT EXISTS platform_settings ( key TEXT PRIMARY KEY, value TEXT );
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                instance_id INTEGER NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
                sender_role VARCHAR(20) NOT NULL CHECK(sender_role IN ('admin', 'superadmin')),
                sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                is_read_by_superadmin BOOLEAN NOT NULL DEFAULT false
            );
            CREATE TABLE IF NOT EXISTS classes (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                order_index INTEGER NOT NULL,
                instance_id INTEGER NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
                UNIQUE(name, instance_id)
            );
            CREATE TABLE IF NOT EXISTS class_financials (
                class_name TEXT NOT NULL,
                year_id INTEGER NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
                mppa NUMERIC(10, 2) NOT NULL,
                instance_id INTEGER NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
                PRIMARY KEY (class_name, year_id, instance_id)
            );
        `);

        if (!await columnExists(client, 'enrollments', 'adjustments')) {
            console.log("Migration: Ajout de 'adjustments' à la table 'enrollments'.");
            await client.query(`ALTER TABLE enrollments ADD COLUMN adjustments JSONB NOT NULL DEFAULT '[]'::jsonb`);
        }
        
        // --- Step 3.5: Create RBAC Tables ---
        await client.query(`
            CREATE TABLE IF NOT EXISTS permissions (
                id SERIAL PRIMARY KEY,
                key VARCHAR(255) NOT NULL UNIQUE,
                description TEXT NOT NULL,
                category VARCHAR(50) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                instance_id INTEGER NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
                UNIQUE(name, instance_id)
            );

            CREATE TABLE IF NOT EXISTS role_permissions (
                role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
                permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
                PRIMARY KEY(role_id, permission_id)
            );

            CREATE TABLE IF NOT EXISTS user_roles (
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
                PRIMARY KEY(user_id, role_id)
            );
        `);
        
        // --- Specific migration for 'announcements' table to ensure instance_id exists ---
        if (await tableExists(client, 'announcements') && !await columnExists(client, 'announcements', 'instance_id')) {
            console.log("Migration: Ajout de 'instance_id' à la table 'announcements'.");
            await client.query('ALTER TABLE announcements ADD COLUMN instance_id INTEGER REFERENCES instances(id) ON DELETE CASCADE');
            // Existing announcements are considered global, so their instance_id will be NULL by default, which is correct.
            console.log("Colonne 'instance_id' ajoutée à 'announcements'.");
        }
        
        // --- Specific migration for 'teachers' table to add 'nif' ---
        if (await tableExists(client, 'teachers') && !await columnExists(client, 'teachers', 'nif')) {
            console.log("Migration: Ajout de 'nif' à la table 'teachers'.");
            await client.query('ALTER TABLE teachers ADD COLUMN nif TEXT');
            console.log("Colonne 'nif' ajoutée à 'teachers'.");
        }

        // --- Specific migration for 'students' table to add 'sexe' and 'nisu' ---
        if (await tableExists(client, 'students') && !await columnExists(client, 'students', 'sexe')) {
            console.log("Migration: Ajout de 'sexe' à la table 'students'.");
            await client.query('ALTER TABLE students ADD COLUMN sexe VARCHAR(1)');
        }
        if (await tableExists(client, 'students') && !await columnExists(client, 'students', 'nisu')) {
            console.log("Migration: Ajout de 'nisu' à la table 'students'.");
            await client.query('ALTER TABLE students ADD COLUMN nisu VARCHAR(255)');
        }

        // --- Specific migration for 'users' table to add 'email' ---
        if (await tableExists(client, 'users') && !await columnExists(client, 'users', 'email')) {
            console.log("Migration: Ajout de 'email' à la table 'users'.");
            await client.query('ALTER TABLE users ADD COLUMN email TEXT');
            console.log("Colonne 'email' ajoutée à 'users'.");
        }

        // --- Step 4: Schema Migration - Add 'instance_id' to all relevant tables ---
        const tablesToMigrate = [
            'users', 'students', 'school_years', 'subjects', 'teachers', 
            'audit_logs', 'locations'
        ];
        
        for (const table of tablesToMigrate) {
            if (await tableExists(client, table) && !await columnExists(client, table, 'instance_id')) {
                console.log(`Migration: Ajout de 'instance_id' à la table '${table}'.`);
                await client.query(`ALTER TABLE ${table} ADD COLUMN instance_id INTEGER`);
                await client.query(`UPDATE ${table} SET instance_id = $1 WHERE instance_id IS NULL`, [defaultInstanceId]);
                
                const fkName = `${table}_instance_id_fkey`;
                if (!await constraintExists(client, fkName)) {
                    await client.query(`ALTER TABLE ${table} ADD CONSTRAINT ${fkName} FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE CASCADE`);
                }

                if (table === 'users' || table === 'subjects' || table === 'teachers' || table === 'school_years' || table === 'locations') {
                    const uniqueColMap = { users: 'username', subjects: 'name', teachers: 'email', school_years: 'name', locations: 'name' };
                    const uniqueCol = uniqueColMap[table];
                    const oldConstraintName = `${table}_${uniqueCol}_key`;
                    if (await constraintExists(client, oldConstraintName)) {
                         await client.query(`ALTER TABLE ${table} DROP CONSTRAINT ${oldConstraintName}`);
                    }
                    
                    const newConstraintName = `${table}_${uniqueCol}_instance_id_key`;
                    if (!await constraintExists(client, newConstraintName)) {
                        await client.query(`ALTER TABLE ${table} ADD CONSTRAINT ${newConstraintName} UNIQUE (${uniqueCol}, instance_id)`);
                    }
                }
                
                console.log(`Colonne 'instance_id' ajoutée et peuplée pour la table '${table}'.`);
            }
        }
        
        // Add FK constraint for users.teacher_id now that teachers table exists
        if (!await constraintExists(client, `users_teacher_id_fkey`)) {
            await client.query(`ALTER TABLE users ADD CONSTRAINT users_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL`);
        }
        
        // --- Step 5: Create Indexes ---
        await client.query('CREATE INDEX IF NOT EXISTS users_instance_id_idx ON users (instance_id);');
        await client.query('CREATE INDEX IF NOT EXISTS students_instance_id_idx ON students (instance_id);');
        await client.query('CREATE INDEX IF NOT EXISTS teachers_instance_id_idx ON teachers (instance_id);');
        await client.query('CREATE INDEX IF NOT EXISTS school_years_instance_id_idx ON school_years (instance_id);');
        await client.query('CREATE INDEX IF NOT EXISTS subjects_instance_id_idx ON subjects (instance_id);');
        await client.query('CREATE INDEX IF NOT EXISTS locations_instance_id_idx ON locations (instance_id);');
        await client.query('CREATE INDEX IF NOT EXISTS audit_logs_instance_id_idx ON audit_logs (instance_id);');
        await client.query('CREATE INDEX IF NOT EXISTS messages_instance_id_idx ON messages (instance_id);');
        await client.query('CREATE INDEX IF NOT EXISTS classes_instance_id_idx ON classes (instance_id);');
        await client.query('CREATE INDEX IF NOT EXISTS class_financials_instance_id_idx ON class_financials (instance_id);');


        // Original indexes
        await client.query('CREATE INDEX IF NOT EXISTS students_nom_idx ON students (nom);');
        await client.query('CREATE INDEX IF NOT EXISTS students_prenom_idx ON students (prenom);');
        await client.query('CREATE INDEX IF NOT EXISTS academic_periods_year_id_idx ON academic_periods (year_id);');
        await client.query('CREATE INDEX IF NOT EXISTS enrollments_student_id_idx ON enrollments (student_id);');
        await client.query('CREATE INDEX IF NOT EXISTS enrollments_year_id_idx ON enrollments (year_id);');
        await client.query('CREATE INDEX IF NOT EXISTS class_subjects_year_class_idx ON class_subjects (year_id, class_name);');
        await client.query('CREATE INDEX IF NOT EXISTS grades_lookup_idx ON grades (enrollment_id, period_id, subject_id);');
        await client.query('CREATE INDEX IF NOT EXISTS teacher_assignments_lookup_idx ON teacher_assignments (teacher_id, year_id);');
        await client.query('CREATE INDEX IF NOT EXISTS audit_logs_timestamp_idx ON audit_logs (timestamp);');
        await client.query('CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs (user_id);');
        await client.query('CREATE INDEX IF NOT EXISTS schedule_slots_assignment_id_idx ON schedule_slots (assignment_id);');


        // --- Step 6: Seeding Data ---
        
        // Seed Permissions
        const permissionsToSeed = [
            { key: 'student:read', description: 'Voir la liste des élèves', category: 'students' },
            { key: 'student:create', description: 'Créer un nouvel élève', category: 'students' },
            { key: 'student:update', description: 'Modifier le profil d\'un élève', category: 'students' },
            { key: 'student:delete', description: 'Supprimer un élève', category: 'students' },
            { key: 'student:archive', description: 'Archiver/Réactiver un élève', category: 'students' },
            { key: 'enrollment:create', description: 'Inscrire un élève à une année', category: 'enrollments' },
            { key: 'enrollment:update_class', description: 'Changer la classe d\'un élève inscrit', category: 'enrollments' },
            { key: 'enrollment:update_payment', description: 'Mettre à jour les paiements', category: 'enrollments' },
            { key: 'report:financial', description: 'Voir les rapports financiers', category: 'reports' },
            { key: 'report:attendance', description: 'Voir les rapports de présence', category: 'reports' },
            { key: 'report_card:generate', description: 'Générer les bulletins de notes', category: 'reports' },
            { key: 'grade:read', description: 'Consulter les notes des élèves', category: 'academics' },
            { key: 'grade:create', description: 'Ajouter/Modifier/Supprimer des notes', category: 'academics' },
            { key: 'appreciation:create', description: 'Ajouter/Modifier des appréciations', category: 'academics' },
            { key: 'student_portal:manage_access', description: 'Activer/Restreindre l\'accès aux notes', category: 'student_portal' },
            { key: 'student_portal:manage_accounts', description: 'Créer/Gérer les comptes élèves', category: 'student_portal' },
            { key: 'settings:manage_academic', description: 'Gérer années, périodes, classes, matières', category: 'administration' },
            { key: 'settings:manage_teachers', description: 'Gérer les professeurs et leurs assignations', category: 'administration' },
            { key: 'settings:manage_timetable', description: 'Gérer l\'emploi du temps', category: 'administration' },
            { key: 'user:manage', description: 'Gérer les comptes utilisateurs (non-prof)', category: 'administration' },
            { key: 'role:manage', description: 'Gérer les rôles et permissions', category: 'administration' },
        ];

        for (const p of permissionsToSeed) {
            await client.query(
                'INSERT INTO permissions (key, description, category) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING',
                [p.key, p.description, p.category]
            );
        }

        const { rows: superAdminRows } = await client.query("SELECT * FROM users WHERE username = 'superadmin'");
        if (superAdminRows.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('superpassword123', salt);
            await client.query("INSERT INTO users (username, password_hash, role, instance_id) VALUES ($1, $2, $3, NULL)", ['superadmin', passwordHash, 'superadmin']);
            console.log("Utilisateur 'superadmin' créé. Veuillez changer le mot de passe !");
        }

        const { rows: instanceRows } = await client.query('SELECT * FROM instances LIMIT 1');
        let instanceId;
        if (instanceRows.length === 0) {
            const { rows: newInstanceRows } = await client.query(`INSERT INTO instances (id, name, address, phone, email, logo_url, passing_grade) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [1, 'IT-School', 'Pelerin 1, Pétion-Ville, Haïti', '+509 4494-2227', 'beauchant509@gmail.com', null, 60]);
            instanceId = newInstanceRows[0].id;
            console.log("Instance par défaut créée.");
        } else {
            instanceId = instanceRows[0].id;
        }

        const { rows: adminUserRows } = await client.query('SELECT * FROM users WHERE username = $1 AND instance_id = $2', ['admin', instanceId]);
        if (adminUserRows.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('password123', salt);
            await client.query('INSERT INTO users (username, password_hash, role, instance_id) VALUES ($1, $2, $3, $4)', ['admin', passwordHash, 'admin', instanceId]);
            console.log(`Utilisateur 'admin' pour l'instance ${instanceId} créé. Veuillez changer le mot de passe !`);
        }

        const { rows: yearRows } = await client.query('SELECT * FROM school_years WHERE instance_id = $1 LIMIT 1', [instanceId]);
        if (yearRows.length === 0) {
            const currentYearName = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
            const { rows: newYearRows } = await client.query('INSERT INTO school_years (name, is_current, instance_id) VALUES ($1, $2, $3) RETURNING id', [currentYearName, true, instanceId]);
            const yearId = newYearRows[0].id;
            
            await client.query('INSERT INTO academic_periods (year_id, name) VALUES ($1, $2)', [yearId, 'Trimestre 1']);
            await client.query('INSERT INTO academic_periods (year_id, name) VALUES ($1, $2)', [yearId, 'Trimestre 2']);
            await client.query('INSERT INTO academic_periods (year_id, name) VALUES ($1, $2)', [yearId, 'Trimestre 3']);
            console.log(`Année scolaire par défaut '${currentYearName}' et 3 trimestres créés pour l'instance ${instanceId}.`);
        }
        
        // Seed default classes for existing instances if they don't have any
        const { rows: classCountRows } = await client.query('SELECT COUNT(*) as count FROM classes WHERE instance_id = $1', [instanceId]);
        if (parseInt(classCountRows[0].count, 10) === 0) {
            console.log(`Peuplement des classes par défaut pour l'instance ${instanceId}...`);
            const defaultClasses = ['7AF', '8AF', '9AF', 'NSI', 'NSII', 'NSIII', 'NSIV'];
            for (let i = 0; i < defaultClasses.length; i++) {
                await client.query(
                    'INSERT INTO classes (name, order_index, instance_id) VALUES ($1, $2, $3) ON CONFLICT (name, instance_id) DO NOTHING',
                    [defaultClasses[i], i + 1, instanceId]
                );
            }
        }

        // Seed platform settings
        await client.query(`INSERT INTO platform_settings (key, value) VALUES ('contact_email', '') ON CONFLICT (key) DO NOTHING;`);
        await client.query(`INSERT INTO platform_settings (key, value) VALUES ('contact_phone', '') ON CONFLICT (key) DO NOTHING;`);

        // --- Data Migration for Roles (v2.1 - ensure critical permissions) ---
        console.log("Migration: Vérification des permissions pour les rôles par défaut (v2.1)...");
        
        const keyRolesPermissions = {
            'Directeur des Opérations': ['student:read', 'student:create', 'student:update', 'student:delete', 'student:archive', 'enrollment:create', 'enrollment:update_class', 'enrollment:update_payment', 'report:financial', 'report:attendance', 'report_card:generate', 'grade:read', 'grade:create', 'appreciation:create', 'student_portal:manage_access', 'student_portal:manage_accounts', 'settings:manage_teachers', 'settings:manage_timetable'],
            'Secrétaire Pédagogique': ['student:read', 'student:create', 'student:update', 'student:delete', 'student:archive', 'enrollment:create', 'enrollment:update_class', 'enrollment:update_payment', 'report:financial', 'report:attendance', 'report_card:generate', 'grade:read', 'appreciation:create', 'student_portal:manage_access', 'student_portal:manage_accounts', 'settings:manage_teachers', 'settings:manage_timetable'],
            'Comptable / Gestionnaire des Paiements': ['student:read', 'enrollment:update_payment', 'report:financial', 'student_portal:manage_access']
        };

        for (const roleName in keyRolesPermissions) {
            const permKeys = keyRolesPermissions[roleName];
            // Find all roles with this name across all instances
            const { rows: rolesToUpdate } = await client.query("SELECT id FROM roles WHERE name = $1", [roleName]);
            
            if (rolesToUpdate.length > 0) {
                // Get all permission IDs for the keys
                const placeholders = permKeys.map((_, i) => `$${i + 1}`).join(',');
                const { rows: permIds } = await client.query(`SELECT id FROM permissions WHERE key IN (${placeholders})`, permKeys);
                
                if (permIds.length > 0) {
                    const permissionIds = permIds.map(p => p.id);
                    for (const role of rolesToUpdate) {
                        for (const permId of permissionIds) {
                            await client.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [role.id, permId]);
                        }
                    }
                    if (permIds.length > 0) console.log(`  -> Rôle '${roleName}' mis à jour avec ${permIds.length} permissions de base.`);
                }
            }
        }
        
        // --- Specific fix for Secrétaire Pédagogique role ---
        console.log("Migration Fix: Assurer que 'Secrétaire Pédagogique' n'a PAS la permission 'grade:create'...");
        const { rows: gradeCreatePermRows } = await client.query("SELECT id FROM permissions WHERE key = 'grade:create'");
        if (gradeCreatePermRows.length > 0) {
            const gradeCreatePermissionId = gradeCreatePermRows[0].id;
            const { rows: secretaryRoles } = await client.query("SELECT id FROM roles WHERE name = 'Secrétaire Pédagogique'");
            
            if (secretaryRoles.length > 0) {
                const secretaryRoleIds = secretaryRoles.map(r => r.id);
                const placeholders = secretaryRoleIds.map((_, i) => `$${i + 2}`).join(',');
        
                const deleteResult = await client.query(
                    `DELETE FROM role_permissions WHERE permission_id = $1 AND role_id IN (${placeholders})`,
                    [gradeCreatePermissionId, ...secretaryRoleIds]
                );
        
                if (deleteResult.rowCount > 0) {
                    console.log(`  -> ${deleteResult.rowCount} 'grade:create' permission(s) retirée(s) du rôle 'Secrétaire Pédagogique'.`);
                }
            }
        }
        // --- End of specific fix ---
        
        console.log("Migration des rôles terminée.");
        
        // --- Step 7: Seed Default Roles for each instance ---
        console.log("Peuplement des rôles par défaut pour toutes les instances...");
        const { rows: allInstances } = await client.query('SELECT id FROM instances');
        const { rows: allPermissions } = await client.query('SELECT id, key FROM permissions');
        const permissionMap = new Map(allPermissions.map(p => [p.key, p.id]));

        for (const instance of allInstances) {
            for (const template of ROLE_TEMPLATES) {
                const roleResult = await client.query(
                    'INSERT INTO roles (name, instance_id) VALUES ($1, $2) ON CONFLICT (name, instance_id) DO UPDATE SET name = EXCLUDED.name RETURNING id',
                    [template.name, instance.id]
                );
                const roleId = roleResult.rows[0].id;
                
                const permissionIds = template.permissionKeys
                    .map(key => permissionMap.get(key))
                    .filter(id => id !== undefined);

                if (permissionIds.length > 0) {
                    const insertPermsQuery = 'INSERT INTO role_permissions (role_id, permission_id) VALUES ' +
                                            permissionIds.map((_, i) => `($1, $${i + 2})`).join(',') +
                                            ' ON CONFLICT DO NOTHING';
                    await client.query(insertPermsQuery, [roleId, ...permissionIds]);
                }
            }
        }
        console.log("Rôles par défaut peuplés.");


        await client.query('COMMIT');
        
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
    
    console.log(`Pool de connexions PostgreSQL prêt à l'emploi.`);
    return pool;
}

module.exports = setup;