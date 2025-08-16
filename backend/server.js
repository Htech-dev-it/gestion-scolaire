require('dotenv').config(); // Charge les variables d'environnement depuis .env

const express = require('express');
const cors = require('cors');
const setupDatabase = require('./database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');
const archiver = require('archiver');


const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'votre_super_secret_jwt_a_changer_absolument';

if (JWT_SECRET === 'votre_super_secret_jwt_a_changer_absolument') {
    console.warn('ATTENTION : Le JWT_SECRET utilise une valeur par défaut. Veuillez définir JWT_SECRET dans votre fichier .env pour la production.');
}


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Centralized Async Error Handling Middleware ---
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(`Error in ${req.method} ${req.originalUrl}:`, err);
    res.status(500).json({ message: 'Erreur interne du serveur.', error: err.message });
  });

// --- Audit Log Helper ---
const logActivity = async (req, action_type, target_id = null, target_name = null, details = null) => {
    if (!req.user) {
        console.error("Audit log error: req.user not found. Cannot log activity.");
        return;
    }
    
    const userRole = req.user.role;
    if (userRole === 'student' || userRole === 'teacher') {
        return; // Do not log activities for students or teachers
    }

    const instanceId = userRole === 'superadmin' || userRole === 'superadmin_delegate' ? null : req.user.instance_id;

    try {
        await req.db.query(
            `INSERT INTO audit_logs (timestamp, user_id, username, action_type, target_id, target_name, details, instance_id)
             VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7)`,
            [req.user.id, req.user.username, action_type, target_id, target_name, details ? JSON.stringify(details) : null, instanceId]
        );
    } catch (err) {
        console.error("Failed to write to audit log:", err);
    }
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Accès non autorisé. Token manquant.' });

    jwt.verify(token, JWT_SECRET, async (err, user) => {
        if (err) return res.status(403).json({ message: 'Accès refusé. Token invalide ou expiré.' });

        const isSuperAdminRole = user.role === 'superadmin' || user.role === 'superadmin_delegate';

        if (!isSuperAdminRole && user.instance_id) {
            try {
                const { rows } = await req.db.query('SELECT status, expires_at FROM instances WHERE id = $1', [user.instance_id]);
                if (rows.length === 0) {
                    return res.status(403).json({ message: "L'instance de votre école n'existe plus." });
                }
                const instance = rows[0];

                if (instance.status === 'suspended') {
                    return res.status(403).json({ message: "Votre session a été terminée car l'accès à cette école a été suspendu." });
                }

                if (instance.expires_at && new Date(instance.expires_at) < new Date()) {
                    await req.db.query("UPDATE instances SET status = 'suspended' WHERE id = $1", [user.instance_id]);
                    return res.status(403).json({ message: "Votre session a été terminée car l'abonnement de votre école a expiré." });
                }
            } catch (dbError) {
                console.error("Database error in authenticateToken:", dbError);
                return res.status(500).json({ message: "Erreur interne du serveur." });
            }
        }
        
        req.user = user;
        next();
    });
};

const isPrincipalSuperAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'superadmin') {
        next();
    } else {
        res.status(403).json({ message: 'Accès refusé. Action réservée au Super Administrateur Principal.' });
    }
};

const isAnySuperAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'superadmin' || user.role === 'superadmin_delegate')) {
        next();
    } else {
        res.status(403).json({ message: 'Accès refusé. Action réservée aux Super Administrateurs.' });
    }
};

const requirePermission = (permissionKey) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Accès non autorisé.' });
        }
        if (req.user.role === 'admin') {
            return next();
        }
        if (req.user.permissions && req.user.permissions.includes(permissionKey)) {
            return next();
        }
        return res.status(403).json({ message: 'Permissions insuffisantes pour effectuer cette action.' });
    };
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Accès refusé. Seuls les administrateurs peuvent effectuer cette action.' });
    }
};

const isTeacher = (req, res, next) => {
    if (req.user && (req.user.role === 'teacher' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Accès réservé aux enseignants.' });
    }
};

const isStudent = (req, res, next) => {
    if (req.user && (req.user.role === 'student' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Accès réservé aux étudiants.' });
    }
};

const isStaff = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'standard' || req.user.role === 'teacher')) {
        next();
    } else {
        res.status(403).json({ message: 'Accès réservé au personnel.' });
    }
};


const formatName = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
const formatLastName = (str) => str ? str.toUpperCase() : '';
const generateTempPassword = () => Math.random().toString(36).slice(-8);

const generateTemporaryNISU = ({ nom, prenom, sexe, date_of_birth }) => {
    if (!nom || !prenom || !sexe || !date_of_birth) {
        return null; // Cannot generate without all info
    }
    // Parse date as UTC to avoid timezone issues with 'YYYY-MM-DD' strings
    const birthDate = new Date(date_of_birth + 'T00:00:00Z');
    const birthDay = birthDate.getUTCDate().toString().padStart(2, '0');
    
    const nomInitial = nom.charAt(0).toUpperCase();
    const prenomInitial = prenom.charAt(0).toUpperCase();
    const prenomLast = prenom.slice(-1).toUpperCase();
    const sexeChar = sexe.toUpperCase();
    
    // Generate a random two-digit number (00-99)
    const randomNumber = Math.floor(Math.random() * 100).toString().padStart(2, '0');

    return `${nomInitial}${prenomInitial}${sexeChar}-${birthDay}${prenomLast}${randomNumber}`;
};

const savePhotoFromBase64 = async (base64DataUrl) => {
    if (!base64DataUrl || !base64DataUrl.startsWith('data:image')) {
        return null;
    }

    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const matches = base64DataUrl.match(/^data:(image\/([a-zA-Z]*));base64,(.+)$/);
    if (!matches || matches.length !== 4) {
        return null; // Invalid format
    }

    const extension = matches[2];
    const base64Data = matches[3];
    const fileContents = Buffer.from(base64Data, 'base64');
    
    const filename = `${crypto.randomBytes(16).toString('hex')}.${extension}`;
    const filePath = path.join(uploadsDir, filename);

    await fs.promises.writeFile(filePath, fileContents);

    return `/uploads/${filename}`; // Return relative path for URL
};

async function startServer() {
    try {
        const dbPool = await setupDatabase();
        app.use((req, res, next) => {
            req.db = dbPool;
            next();
        });
        
        const pruneOldLogs = async () => {
            try {
                const client = await dbPool.connect();
                try {
                    // Only delete logs for instances, not for superadmin (where instance_id IS NULL)
                    const result = await client.query("DELETE FROM audit_logs WHERE instance_id IS NOT NULL AND timestamp < NOW() - INTERVAL '15 days'");
                    if (result.rowCount > 0) {
                        console.log(`[Auto-Prune] Cleaned up ${result.rowCount} old instance audit log entries.`);
                    }
                } finally {
                    client.release();
                }
            } catch (err) {
                console.error('[Auto-Prune] Error cleaning up old audit logs:', err);
            }
        };

        pruneOldLogs();
        setInterval(pruneOldLogs, 24 * 60 * 60 * 1000); // 24 hours

        // --- AUTH & USER MANAGEMENT ---
        app.post('/api/login', asyncHandler(async (req, res) => {
            const { username, password } = req.body;
            const client = await req.db.connect();
        
            try {
                // 1. Check staff users in 'users' table
                let { rows: staffRows } = await client.query('SELECT * FROM users WHERE username = $1', [username]);
                let user = null;
                let isStudentLogin = false;
        
                for (const candidate of staffRows) {
                    if (await bcrypt.compare(password, candidate.password_hash)) {
                        user = candidate;
                        break;
                    }
                }
        
                // 2. If not found, check student users in 'student_users' table
                if (!user) {
                    let { rows: studentRows } = await client.query(`
                        SELECT su.id, su.username, su.password_hash, su.student_id, s.instance_id, s.prenom, s.nom
                        FROM student_users su
                        JOIN students s ON su.student_id = s.id
                        WHERE su.username = $1 AND s.status = 'active'
                    `, [username]);
        
                    if (studentRows.length > 0) {
                        const studentUser = studentRows[0];
                        if (await bcrypt.compare(password, studentUser.password_hash)) {
                            isStudentLogin = true;
                            user = {
                                id: studentUser.id,
                                username: studentUser.username,
                                role: 'student',
                                instance_id: studentUser.instance_id,
                                student_id: studentUser.student_id,
                                prenom: studentUser.prenom,
                                nom: studentUser.nom
                            };
                        }
                    }
                }
        
                // 3. If no user found anywhere, reject
                if (!user) {
                    return res.status(401).json({ message: 'Identifiants invalides' });
                }
        
                // 4. Check instance status for non-superadmin users
                const isSuperAdminRole = user.role === 'superadmin' || user.role === 'superadmin_delegate';
                if (!isSuperAdminRole && user.instance_id) {
                    const { rows: instanceRows } = await client.query('SELECT status, expires_at FROM instances WHERE id = $1', [user.instance_id]);
                    if (instanceRows.length === 0 || instanceRows[0].status === 'suspended') {
                        return res.status(403).json({ message: 'Accès à cette école suspendu. Veuillez contacter le support.' });
                    }
                    if (instanceRows[0].expires_at && new Date(instanceRows[0].expires_at) < new Date()) {
                        await client.query("UPDATE instances SET status = 'suspended' WHERE id = $1", [user.instance_id]);
                        return res.status(403).json({ message: "L'abonnement de cette école a expiré. Veuillez contacter le support." });
                    }
                }
        
                // 5. Prepare token payload with necessary profile data
                let profileData = {};
                let userPermissions = [];
                let userRoles = [];
                let effectiveRole = user.role; // Initialize with the user's database role

                if (isStudentLogin) {
                    profileData = { prenom: user.prenom, nom: user.nom, student_id: user.student_id };
                } else if (user.role === 'teacher') {
                    const { rows: teacherRows } = await client.query('SELECT prenom, nom FROM teachers WHERE user_id = $1', [user.id]);
                    profileData = teacherRows[0] || {};
                } else if (user.role === 'admin') {
                    const { rows: allPerms } = await client.query('SELECT key FROM permissions');
                    userPermissions = allPerms.map(p => p.key);
                } else if (user.role === 'standard') {
                    const { rows: assignedRolesRows } = await client.query(`
                        SELECT r.id, r.name
                        FROM user_roles ur
                        JOIN roles r ON ur.role_id = r.id
                        WHERE ur.user_id = $1 AND r.instance_id = $2
                    `, [user.id, user.instance_id]);
                    userRoles = assignedRolesRows;

                    const isPrincipalAdmin = userRoles.some(role => role.name === 'Administrateur Principal');
                    
                    if (isPrincipalAdmin) {
                        const { rows: allPerms } = await client.query('SELECT key FROM permissions');
                        userPermissions = allPerms.map(p => p.key);
                        effectiveRole = 'admin'; // Elevate role to 'admin' for the session token
                    } else {
                        if (userRoles.length > 0) {
                            const roleIds = userRoles.map(r => r.id);
                            const placeholders = roleIds.map((_, i) => `$${i + 1}`).join(',');
                            const { rows: permissionsForRoles } = await client.query(`
                                SELECT DISTINCT p.key
                                FROM role_permissions rp
                                JOIN permissions p ON rp.permission_id = p.id
                                WHERE rp.role_id IN (${placeholders})
                            `, roleIds);
                            userPermissions = permissionsForRoles.map(p => p.key);
                        } else {
                            userPermissions = [];
                        }
                    }
                }
                
                const payload = {
                    id: user.id,
                    username: user.username,
                    role: effectiveRole, // Use the effective role
                    instance_id: user.instance_id,
                    permissions: userPermissions,
                    roles: userRoles,
                    ...profileData,
                };
                
                const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
                
                // 6. Log activity
                req.user = payload; // Attach user to req for logActivity
                const logAction = user.role === 'student' ? 'LOGIN_SUCCESS_STUDENT' : 'LOGIN_SUCCESS_STAFF';
                await logActivity(req, logAction, user.id, user.username, `Utilisateur '${user.username}' connecté avec succès.`);
        
                // 7. Send token
                res.json({ accessToken });
            } finally {
                client.release();
            }
        }));
        
        app.post('/api/register', authenticateToken, requirePermission('user:manage'), asyncHandler(async (req, res) => {
            const { username, password } = req.body;
            if (!username || !password) return res.status(400).json({ message: 'Nom d\'utilisateur et mot de passe requis' });
            
            const { rows: existingUserRows } = await req.db.query('SELECT * FROM users WHERE username = $1 AND instance_id = $2', [username, req.user.instance_id]);
            if (existingUserRows.length > 0) return res.status(409).json({ message: 'Nom d\'utilisateur déjà utilisé.' });
            
            const hashedPassword = bcrypt.hashSync(password, 10);
            const { rows } = await req.db.query('INSERT INTO users (username, password_hash, role, instance_id) VALUES ($1, $2, $3, $4) RETURNING id', [username, hashedPassword, 'standard', req.user.instance_id]);
            
            await logActivity(req, 'USER_CREATED', rows[0].id, username, `Compte utilisateur '${username}' créé.`);
            
            res.status(201).json({ message: `Utilisateur '${username}' créé avec succès.` });
        }));

        app.delete('/api/delete-user/:id', authenticateToken, requirePermission('user:manage'), asyncHandler(async (req, res) => {
            const { id } = req.params;

            const { rows } = await req.db.query('SELECT * FROM users WHERE id = $1 AND instance_id = $2', [id, req.user.instance_id]);
            const userToDelete = rows[0];

            if (!userToDelete) return res.status(404).json({ message: "Utilisateur non trouvé." });
            if (userToDelete.username === 'admin') return res.status(403).json({ message: "L'utilisateur 'admin' principal ne peut pas être supprimé." });
            if (userToDelete.id === req.user.id) return res.status(403).json({ message: "Vous ne pouvez pas supprimer votre propre compte." });

            if (userToDelete.role === 'admin') {
                const { rows: adminCountRows } = await req.db.query('SELECT COUNT(*) as count FROM users WHERE role = $1 AND instance_id = $2', ['admin', req.user.instance_id]);
                if (parseInt(adminCountRows[0].count, 10) <= 1) {
                    return res.status(403).json({ message: "Impossible de supprimer le dernier compte administrateur." });
                }
            }
            
            await req.db.query('DELETE FROM users WHERE id = $1', [id]);
            await logActivity(req, 'USER_DELETED', id, userToDelete.username, `Utilisateur '${userToDelete.username}' supprimé.`);
            res.json({ message: `Utilisateur '${userToDelete.username}' supprimé.` });
        }));
        
        app.get('/api/users', authenticateToken, requirePermission('user:manage'), asyncHandler(async (req, res) => {
            const { rows } = await req.db.query(`
                SELECT
                    u.id,
                    u.username,
                    u.role,
                    (
                        SELECT json_agg(json_build_object('id', r.id, 'name', r.name))
                        FROM user_roles ur
                        JOIN roles r ON ur.role_id = r.id
                        WHERE ur.user_id = u.id
                    ) as roles
                FROM users u
                WHERE u.instance_id = $1 AND u.role IN ('admin', 'standard', 'teacher')
            `, [req.user.instance_id]);
            res.json(rows.map(user => ({...user, roles: user.roles || [] })));
        }));
        
        app.put('/api/users/:id/roles', authenticateToken, requirePermission('role:manage'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { roleIds } = req.body;

            const client = await req.db.connect();
            try {
                await client.query('BEGIN');
                const { rowCount } = await client.query('SELECT 1 FROM users WHERE id = $1 AND instance_id = $2', [id, req.user.instance_id]);
                if (rowCount === 0) {
                    return res.status(404).json({ message: 'Utilisateur non trouvé ou non autorisé.' });
                }
                
                await client.query('DELETE FROM user_roles WHERE user_id = $1', [id]);

                if (roleIds && roleIds.length > 0) {
                    const insertQuery = 'INSERT INTO user_roles (user_id, role_id) VALUES ' + roleIds.map((_, i) => `($1, $${i + 2})`).join(',');
                    await client.query(insertQuery, [id, ...roleIds]);
                }
                await client.query('COMMIT');
                res.json({ message: 'Rôles mis à jour.' });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        }));


        app.put('/api/user/change-password', authenticateToken, asyncHandler(async (req, res) => {
            const { currentPassword, newPassword } = req.body;
            const { id: userId, username } = req.user;
            
            const { rows } = await req.db.query('SELECT * FROM users WHERE id = $1', [userId]);
            const user = rows[0];
            
            if (!user || !await bcrypt.compare(currentPassword, user.password_hash)) {
                return res.status(401).json({ message: 'Le mot de passe actuel est incorrect.' });
            }
            const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
            await req.db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedNewPassword, userId]);
            await logActivity(req, 'PASSWORD_CHANGED', req.user.id, req.user.username, 'Mot de passe personnel mis à jour.');
            res.json({ message: 'Mot de passe mis à jour.' });
        }));

        app.put('/api/users/:id/reset-password', authenticateToken, requirePermission('user:manage'), asyncHandler(async (req, res) => {
            const { id } = req.params;
        
            const { rows } = await req.db.query('SELECT * FROM users WHERE id = $1 AND instance_id = $2', [id, req.user.instance_id]);
            const userToReset = rows[0];
        
            if (!userToReset) return res.status(404).json({ message: "Utilisateur non trouvé." });
            if (userToReset.username === 'admin' && userToReset.role === 'admin') return res.status(403).json({ message: "Le mot de passe de l'utilisateur 'admin' principal ne peut pas être réinitialisé." });
            if (userToReset.id === req.user.id) return res.status(403).json({ message: "Vous ne pouvez pas réinitialiser votre propre mot de passe." });
        
            const tempPassword = generateTempPassword();
            const hashedPassword = bcrypt.hashSync(tempPassword, 10);
        
            await req.db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, id]);
            
            await logActivity(req, 'USER_PASSWORD_RESET', id, userToReset.username, `Mot de passe de l'utilisateur '${userToReset.username}' réinitialisé.`);
            
            res.json({ username: userToReset.username, tempPassword });
        }));

        // --- RBAC MANAGEMENT ROUTES ---
        app.get('/api/permissions', authenticateToken, requirePermission('role:manage'), asyncHandler(async (req, res) => {
            const { rows } = await req.db.query('SELECT * FROM permissions ORDER BY category, description');
            res.json(rows);
        }));

        app.get('/api/roles', authenticateToken, requirePermission('role:manage'), asyncHandler(async (req, res) => {
            const { rows } = await req.db.query(`
                SELECT
                    r.*,
                    (
                        SELECT json_agg(p.*)
                        FROM role_permissions rp
                        JOIN permissions p ON rp.permission_id = p.id
                        WHERE rp.role_id = r.id
                    ) as permissions
                FROM roles r
                WHERE r.instance_id = $1
                ORDER BY r.name
            `, [req.user.instance_id]);
            res.json(rows.map(role => ({ ...role, permissions: role.permissions || [] })));
        }));

        app.post('/api/roles', authenticateToken, requirePermission('role:manage'), asyncHandler(async (req, res) => {
            const { name, permissionIds } = req.body;
            const client = await req.db.connect();
            try {
                await client.query('BEGIN');
                const roleResult = await client.query('INSERT INTO roles (name, instance_id) VALUES ($1, $2) RETURNING id', [name, req.user.instance_id]);
                const newRoleId = roleResult.rows[0].id;
                if (permissionIds && permissionIds.length > 0) {
                    const insertPermissionsQuery = 'INSERT INTO role_permissions (role_id, permission_id) VALUES ' + permissionIds.map((_, i) => `($1, $${i + 2})`).join(',');
                    await client.query(insertPermissionsQuery, [newRoleId, ...permissionIds]);
                }
                await client.query('COMMIT');
                res.status(201).json({ id: newRoleId, name });
            } catch (error) {
                await client.query('ROLLBACK');
                if (error.code === '23505') return res.status(409).json({ message: 'Un rôle avec ce nom existe déjà.' });
                throw error;
            } finally {
                client.release();
            }
        }));

        app.put('/api/roles/:id', authenticateToken, requirePermission('role:manage'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { name, permissionIds } = req.body;
            const client = await req.db.connect();
            try {
                await client.query('BEGIN');
                await client.query('UPDATE roles SET name = $1 WHERE id = $2 AND instance_id = $3', [name, id, req.user.instance_id]);
                await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
                if (permissionIds && permissionIds.length > 0) {
                    const insertPermissionsQuery = 'INSERT INTO role_permissions (role_id, permission_id) VALUES ' + permissionIds.map((_, i) => `($1, $${i + 2})`).join(',');
                    await client.query(insertPermissionsQuery, [id, ...permissionIds]);
                }
                await client.query('COMMIT');
                res.json({ message: 'Rôle mis à jour.' });
            } catch (error) {
                await client.query('ROLLBACK');
                if (error.code === '23505') return res.status(409).json({ message: 'Un rôle avec ce nom existe déjà.' });
                throw error;
            } finally {
                client.release();
            }
        }));

        app.delete('/api/roles/:id', authenticateToken, requirePermission('role:manage'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            await req.db.query('DELETE FROM roles WHERE id = $1 AND instance_id = $2', [id, req.user.instance_id]);
            res.status(204).send();
        }));

        // --- SUPER ADMIN ROUTES ---
        app.get('/api/superadmin/dashboard-stats', authenticateToken, isAnySuperAdmin, asyncHandler(async (req, res) => {
            const [
                { rows: [instanceStats] },
                { rows: [userStats] },
                { rows: [studentStats] }
            ] = await Promise.all([
                req.db.query("SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'active' THEN 1 END) as active FROM instances"),
                req.db.query("SELECT COUNT(*) as total FROM users WHERE role NOT IN ('superadmin', 'superadmin_delegate')"),
                req.db.query("SELECT COUNT(*) as total FROM students WHERE status = 'active'")
            ]);
            
            res.json({
                totalInstances: parseInt(instanceStats.total, 10),
                activeInstances: parseInt(instanceStats.active, 10),
                totalUsers: parseInt(userStats.total, 10),
                totalStudents: parseInt(studentStats.total, 10)
            });
        }));

        app.get('/api/superadmin/instances', authenticateToken, isAnySuperAdmin, asyncHandler(async (req, res) => {
            const { rows: instances } = await req.db.query('SELECT * FROM instances ORDER BY name');
            const { rows: admins } = await req.db.query("SELECT id, username, instance_id FROM users WHERE role = 'admin'");
            
            const instancesWithAdmins = instances.map(instance => ({
                ...instance,
                admins: admins.filter(admin => admin.instance_id === instance.id)
            }));
            
            res.json(instancesWithAdmins);
        }));

        app.post('/api/superadmin/instances', authenticateToken, isAnySuperAdmin, asyncHandler(async (req, res) => {
            const { name, admin_email, address, phone } = req.body;
            const client = await req.db.connect();
            try {
                await client.query('BEGIN');
                
                const instanceResult = await client.query(
                    'INSERT INTO instances (name, email, address, phone) VALUES ($1, $2, $3, $4) RETURNING *',
                    [name, admin_email, address || null, phone || null]
                );
                const newInstance = instanceResult.rows[0];

                const username = 'admin'; // Default admin username for new instances
                const tempPassword = generateTempPassword();
                const passwordHash = await bcrypt.hash(tempPassword, 10);

                await client.query(
                    'INSERT INTO users (username, password_hash, role, instance_id) VALUES ($1, $2, $3, $4)',
                    [username, passwordHash, 'admin', newInstance.id]
                );
                
                await client.query('COMMIT');
                
                await logActivity(req, 'INSTANCE_CREATED', newInstance.id, newInstance.name, `Instance '${newInstance.name}' (ID: ${newInstance.id}) créée.`);
                
                res.status(201).json({
                    instance: newInstance,
                    credentials: { username, tempPassword }
                });

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        }));

        app.put('/api/superadmin/instances/:id/details', authenticateToken, isAnySuperAdmin, asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { name, address, phone, email } = req.body;
            
            if (!name) {
                return res.status(400).json({ message: 'Le nom de l\'instance est requis.' });
            }

            const { rows } = await req.db.query(
                'UPDATE instances SET name = $1, address = $2, phone = $3, email = $4 WHERE id = $5 RETURNING *',
                [name, address, phone, email, id]
            );

            if (rows.length === 0) {
                return res.status(404).json({ message: 'Instance non trouvée.' });
            }
            
            await logActivity(req, 'INSTANCE_UPDATED', id, name, `Détails de l'instance '${name}' (ID: ${id}) mis à jour.`);
            
            res.json(rows[0]);
        }));

        app.put('/api/superadmin/instances/:id/status', authenticateToken, isAnySuperAdmin, asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { status } = req.body; // this is the NEW status to set
        
            if (!['active', 'suspended'].includes(status)) {
                return res.status(400).json({ message: 'Statut invalide.' });
            }
            
            const { rows: instanceRows } = await req.db.query("SELECT name FROM instances WHERE id = $1", [id]);
            if (instanceRows.length === 0) return res.status(404).json({ message: 'Instance non trouvée.' });
            const instanceName = instanceRows[0].name;

        
            if (status === 'active') {
                await req.db.query("UPDATE instances SET status = 'active', expires_at = NULL WHERE id = $1", [id]);
            } else { // status === 'suspended'
                await req.db.query('UPDATE instances SET status = $1 WHERE id = $2', [status, id]);
            }
            
            await logActivity(req, 'INSTANCE_STATUS_CHANGED', id, instanceName, `Statut de l'instance '${instanceName}' (ID: ${id}) changé en '${status}'.`);
            res.json({ message: 'Statut mis à jour.' });
        }));
        
        app.put('/api/superadmin/instances/:id/expires', authenticateToken, isAnySuperAdmin, asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { expires_at } = req.body; // Can be a date string or null
            
            const { rows: instanceRows } = await req.db.query("SELECT name FROM instances WHERE id = $1", [id]);
            if (instanceRows.length === 0) return res.status(404).json({ message: 'Instance non trouvée.' });
            const instanceName = instanceRows[0].name;

            await req.db.query('UPDATE instances SET expires_at = $1 WHERE id = $2', [expires_at, id]);
            
            const details = expires_at 
                ? `Date d'expiration de l'instance '${instanceName}' (ID: ${id}) mise à jour pour le ${new Date(expires_at).toLocaleDateString('fr-FR')}.`
                : `Date d'expiration de l'instance '${instanceName}' (ID: ${id}) supprimée.`;

            await logActivity(req, 'INSTANCE_EXPIRATION_CHANGED', id, instanceName, details);
            res.json({ message: "Date d'expiration mise à jour." });
        }));

        app.delete('/api/superadmin/instances/:id', authenticateToken, isPrincipalSuperAdmin, asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { password } = req.body;

            if (!password) {
                return res.status(400).json({ message: "Le mot de passe est requis pour la suppression." });
            }

            const { rows } = await req.db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
            const superAdminUser = rows[0];

            if (!await bcrypt.compare(password, superAdminUser.password_hash)) {
                return res.status(403).json({ message: 'Mot de passe incorrect.' });
            }
            
            const { rows: instanceToDeleteRows } = await req.db.query("SELECT name FROM instances WHERE id = $1", [id]);
            if (instanceToDeleteRows.length === 0) {
                 return res.status(404).json({ message: "Instance non trouvée." });
            }
            const instanceToDelete = instanceToDeleteRows[0];
            
            const result = await req.db.query('DELETE FROM instances WHERE id = $1', [id]);
            
            if (result.rowCount === 0) {
                return res.status(404).json({ message: "Instance non trouvée." });
            }
            
            await logActivity(req, 'INSTANCE_DELETED', id, instanceToDelete.name, `Instance '${instanceToDelete.name}' (ID: ${id}) supprimée.`);
            res.json({ message: "L'instance et toutes ses données ont été supprimées définitivement." });
        }));

        app.put('/api/superadmin/users/:userId/reset-password', authenticateToken, isAnySuperAdmin, asyncHandler(async (req, res) => {
            const { userId } = req.params;
            const { rows } = await req.db.query("SELECT * FROM users WHERE id = $1 AND role = 'admin'", [userId]);
            const user = rows[0];
            if (!user) return res.status(404).json({ message: 'Utilisateur admin non trouvé.' });

            const tempPassword = generateTempPassword();
            const hashedPassword = bcrypt.hashSync(tempPassword, 10);

            await req.db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, userId]);
            await logActivity(req, 'ADMIN_PASSWORD_RESET', userId, user.username, `Mot de passe de l'admin '${user.username}' (ID: ${userId}) réinitialisé.`);
            res.json({ username: user.username, tempPassword });
        }));

        // --- NEW SUPER ADMIN USER MANAGEMENT ---
        app.get('/api/superadmin/superadmins', authenticateToken, isPrincipalSuperAdmin, asyncHandler(async(req, res) => {
            const { rows } = await req.db.query(`
                SELECT id, username, role FROM users 
                WHERE role IN ('superadmin', 'superadmin_delegate') 
                ORDER BY role DESC, username ASC
            `);
            res.json(rows);
        }));

        app.post('/api/superadmin/superadmins', authenticateToken, isPrincipalSuperAdmin, asyncHandler(async(req, res) => {
            const { username, password } = req.body;
            if (!username || !password) return res.status(400).json({ message: 'Nom d\'utilisateur et mot de passe requis.' });
            
            const { rows: existing } = await req.db.query('SELECT id FROM users WHERE username = $1', [username]);
            if (existing.length > 0) return res.status(409).json({ message: 'Ce nom d\'utilisateur est déjà pris.' });

            const passwordHash = await bcrypt.hash(password, 10);
            const { rows } = await req.db.query(
                `INSERT INTO users (username, password_hash, role, instance_id) VALUES ($1, $2, 'superadmin_delegate', NULL) RETURNING id, username, role`,
                [username, passwordHash]
            );
            
            await logActivity(req, 'SUPERADMIN_DELEGATE_CREATED', rows[0].id.toString(), username, `Super admin délégué '${username}' créé.`);
            res.status(201).json(rows[0]);
        }));

        app.delete('/api/superadmin/superadmins/:id', authenticateToken, isPrincipalSuperAdmin, asyncHandler(async (req, res) => {
            const { id } = req.params;
            if (parseInt(id, 10) === req.user.id) return res.status(403).json({ message: 'Vous ne pouvez pas supprimer votre propre compte.' });

            const { rows } = await req.db.query("SELECT * FROM users WHERE id = $1 AND role = 'superadmin_delegate'", [id]);
            if (rows.length === 0) return res.status(404).json({ message: 'Super admin délégué non trouvé.' });
            
            await req.db.query('DELETE FROM users WHERE id = $1', [id]);
            await logActivity(req, 'SUPERADMIN_DELEGATE_DELETED', id, rows[0].username, `Super admin délégué '${rows[0].username}' supprimé.`);
            res.status(204).send();
        }));

        app.put('/api/superadmin/superadmins/:id/reset-password', authenticateToken, isPrincipalSuperAdmin, asyncHandler(async (req, res) => {
            const { id } = req.params;
            if (parseInt(id, 10) === req.user.id) return res.status(403).json({ message: 'Vous ne pouvez pas réinitialiser votre propre mot de passe.' });
            
            const { rows } = await req.db.query("SELECT * FROM users WHERE id = $1 AND role = 'superadmin_delegate'", [id]);
            const userToReset = rows[0];
            if (!userToReset) return res.status(404).json({ message: 'Super admin délégué non trouvé.' });

            const tempPassword = generateTempPassword();
            const hashedPassword = bcrypt.hashSync(tempPassword, 10);
            await req.db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, id]);
            
            await logActivity(req, 'SUPERADMIN_DELEGATE_PASSWORD_RESET', id, userToReset.username, `Mot de passe du super admin délégué '${userToReset.username}' réinitialisé.`);
            res.json({ username: userToReset.username, tempPassword });
        }));


        // --- SUPER ADMIN ANNOUNCEMENT MANAGEMENT ---
        app.get('/api/superadmin/announcements', authenticateToken, isAnySuperAdmin, asyncHandler(async (req, res) => {
            const { rows } = await req.db.query('SELECT * FROM announcements ORDER BY created_at DESC');
            res.json(rows);
        }));

        app.post('/api/superadmin/announcements', authenticateToken, isAnySuperAdmin, asyncHandler(async (req, res) => {
            const { title, content, instance_id } = req.body;
            const { rows } = await req.db.query(
                'INSERT INTO announcements (title, content, instance_id) VALUES ($1, $2, $3) RETURNING *',
                [title, content, instance_id || null]
            );
            const newAnnouncement = rows[0];
            await logActivity(req, 'ANNOUNCEMENT_CREATED', newAnnouncement.id.toString(), newAnnouncement.title, `Annonce '${newAnnouncement.title}' créée.`);
            res.status(201).json(newAnnouncement);
        }));

        app.put('/api/superadmin/announcements/:id', authenticateToken, isAnySuperAdmin, asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { title, content, is_active, instance_id } = req.body;
            const { rows } = await req.db.query(
                'UPDATE announcements SET title = $1, content = $2, is_active = $3, instance_id = $4 WHERE id = $5 RETURNING *',
                [title, content, is_active, instance_id || null, id]
            );
            if (rows.length === 0) return res.status(404).json({ message: 'Annonce non trouvée.' });
            
            await logActivity(req, 'ANNOUNCEMENT_UPDATED', id, title, `Annonce '${title}' mise à jour.`);
            res.json(rows[0]);
        }));

        app.delete('/api/superadmin/announcements/:id', authenticateToken, isAnySuperAdmin, asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { rows } = await req.db.query("SELECT title FROM announcements WHERE id = $1", [id]);
            const announcementToDelete = rows[0];
            
            const result = await req.db.query('DELETE FROM announcements WHERE id = $1', [id]);
            if (result.rowCount > 0 && announcementToDelete) {
                await logActivity(req, 'ANNOUNCEMENT_DELETED', id, announcementToDelete.title, `Annonce '${announcementToDelete.title}' supprimée.`);
            }
            res.status(204).send();
        }));

        // --- ADMIN ANNOUNCEMENT VIEWING ---
        app.get('/api/announcements/active', authenticateToken, isAdmin, asyncHandler(async (req, res) => {
            const { rows } = await req.db.query(
                `SELECT id, title, content, created_at 
                 FROM announcements 
                 WHERE is_active = true AND (instance_id IS NULL OR instance_id = $1)
                 ORDER BY created_at DESC`,
                [req.user.instance_id]
            );
            res.json(rows);
        }));

        // --- INSTANCE (SCHOOL INFO) ROUTES ---
        app.get('/api/instance/default', asyncHandler(async (req, res) => {
            // This is for the login page, so it fetches the first available active instance.
            const { rows } = await req.db.query("SELECT name, logo_url FROM instances WHERE status = 'active' ORDER BY id LIMIT 1");
            if (rows.length === 0) {
                 const { rows: anyRows } = await req.db.query("SELECT name, logo_url FROM instances ORDER BY id LIMIT 1");
                 return res.json(anyRows[0] || {});
            }
            res.json(rows[0]);
        }));

        app.get('/api/instance/current', authenticateToken, asyncHandler(async (req, res) => {
            if (!req.user.instance_id) {
                return res.status(404).json({ message: "Aucune instance associée à cet utilisateur." });
            }
            const { rows } = await req.db.query('SELECT * FROM instances WHERE id = $1', [req.user.instance_id]);
            res.json(rows[0]);
        }));
        
        app.put('/api/instance/current', authenticateToken, isAdmin, asyncHandler(async (req, res) => {
            const { name, address, phone, email, logo_url, passing_grade } = req.body;
            await req.db.query(
                'UPDATE instances SET name = $1, address = $2, phone = $3, email = $4, logo_url = $5, passing_grade = $6 WHERE id = $7',
                [name, address, phone, email, logo_url, passing_grade, req.user.instance_id]
            );
            await logActivity(req, 'SCHOOL_INFO_UPDATED', req.user.instance_id, name, "Informations de l'établissement mises à jour.");
            res.json({ message: "Informations de l'école mises à jour." });
        }));
        
        // --- AUDIT LOGS ---
        
        // Generic log fetching function
        const fetchLogs = async (db, conditions, params, page, limit) => {
            let query = `SELECT * FROM audit_logs`;
            let countQuery = `SELECT COUNT(*) as total FROM audit_logs`;
            
            if (conditions.length > 0) {
                const whereClause = ` WHERE ` + conditions.join(' AND ');
                query += whereClause;
                countQuery += whereClause;
            }

            const totalResult = await db.query(countQuery, params);
            const total = parseInt(totalResult.rows[0].total, 10);
            
            const offset = (page - 1) * limit;
            query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(limit, offset);
            
            const { rows: logs } = await db.query(query, params);
            
            return {
                logs,
                pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) }
            };
        };

        const buildFilterConditions = (queryParams) => {
            const { startDate, endDate, userId, searchTerm } = queryParams;
            const conditions = [];
            const params = [];
            let paramIndex = 1;

            if (startDate) { conditions.push(`timestamp >= $${paramIndex++}`); params.push(startDate); }
            if (endDate) { conditions.push(`timestamp <= $${paramIndex++}`); params.push(endDate + 'T23:59:59.999Z'); }
            if (userId && userId !== 'all') { conditions.push(`user_id = $${paramIndex++}`); params.push(userId); }
            if (searchTerm) {
                conditions.push(`(action_type ILIKE $${paramIndex} OR target_name ILIKE $${paramIndex} OR details::text ILIKE $${paramIndex})`);
                params.push(`%${searchTerm}%`);
                paramIndex++;
            }
            return { conditions, params };
        };

        app.get('/api/admin/audit-logs', authenticateToken, isAdmin, asyncHandler(async (req, res) => {
            const { page = 1, limit = 25 } = req.query;
            const { conditions, params } = buildFilterConditions(req.query);
            
            conditions.unshift(`instance_id = $${params.length + 1}`);
            params.push(req.user.instance_id);

            const result = await fetchLogs(req.db, conditions, params, page, limit);
            res.json(result);
        }));
        
        app.get('/api/superadmin/audit-logs', authenticateToken, isAnySuperAdmin, asyncHandler(async (req, res) => {
            const { page = 1, limit = 25 } = req.query;
            const { conditions, params } = buildFilterConditions(req.query);
            
            // Determine which roles' logs to fetch based on the requester's role
            const targetRoles = req.user.role === 'superadmin' 
                ? ['superadmin', 'superadmin_delegate'] 
                : ['superadmin_delegate'];

            // Get the user IDs corresponding to the target roles
            const rolePlaceholders = targetRoles.map((_, i) => `$${i + 1}`).join(',');
            const { rows: targetUsers } = await req.db.query(`SELECT id FROM users WHERE role IN (${rolePlaceholders})`, targetRoles);
            const targetUserIds = targetUsers.map(u => u.id);

            if (targetUserIds.length === 0) {
                // No users with the target roles exist, so no logs to show.
                return res.json({ logs: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 1 } });
            }
            
            // Add the user_id filter condition to the existing filter conditions
            const userIdPlaceholders = targetUserIds.map((_, i) => `$${params.length + i + 1}`).join(',');
            conditions.push(`user_id IN (${userIdPlaceholders})`);
            params.push(...targetUserIds);
            
            const result = await fetchLogs(req.db, conditions, params, page, limit);
            res.json(result);
        }));

        app.post('/api/admin/audit-logs/delete-by-date', authenticateToken, isAdmin, asyncHandler(async (req, res) => {
            const { startDate, endDate } = req.body;
            if (!startDate || !endDate) return res.status(400).json({ message: 'Les dates de début et de fin sont requises.' });

            const result = await req.db.query(
                "DELETE FROM audit_logs WHERE instance_id = $1 AND timestamp >= $2 AND timestamp <= $3",
                [req.user.instance_id, startDate, endDate + 'T23:59:59.999Z']
            );
            await logActivity(req, 'AUDIT_LOGS_DELETED_BY_DATE', null, null, `${result.rowCount} journaux supprimés pour la période du ${startDate} au ${endDate}.`);
            res.json({ message: `${result.rowCount} enregistrement(s) supprimé(s).` });
        }));
        
        app.post('/api/superadmin/audit-logs/delete-by-date', authenticateToken, isPrincipalSuperAdmin, asyncHandler(async (req, res) => {
            const { startDate, endDate } = req.body;
            if (!startDate || !endDate) return res.status(400).json({ message: 'Les dates de début et de fin sont requises.' });

            const result = await req.db.query(
                "DELETE FROM audit_logs WHERE instance_id IS NULL AND timestamp >= $1 AND timestamp <= $2",
                [startDate, endDate + 'T23:59:59.999Z']
            );
            await logActivity(req, 'SUPERADMIN_LOGS_DELETED_BY_DATE', null, null, `${result.rowCount} journaux supprimés pour la période du ${startDate} au ${endDate}.`);
            res.json({ message: `${result.rowCount} enregistrement(s) supprimé(s).` });
        }));

        app.post('/api/admin/audit-logs/delete-bulk', authenticateToken, isAdmin, asyncHandler(async (req, res) => {
            const { ids } = req.body;
            if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'Aucun ID de journal fourni.' });

            const placeholders = ids.map((_, i) => `$${i + 2}`).join(',');
            const result = await req.db.query(
                `DELETE FROM audit_logs WHERE instance_id = $1 AND id IN (${placeholders})`,
                [req.user.instance_id, ...ids]
            );
            await logActivity(req, 'AUDIT_LOGS_DELETED_BULK', null, null, `${result.rowCount} journaux sélectionnés supprimés.`);
            res.json({ message: `${result.rowCount} enregistrement(s) supprimé(s).` });
        }));

        app.post('/api/superadmin/audit-logs/delete-bulk', authenticateToken, isPrincipalSuperAdmin, asyncHandler(async (req, res) => {
            const { ids } = req.body;
            if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'Aucun ID de journal fourni.' });

            const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
            const result = await req.db.query(
                `DELETE FROM audit_logs WHERE instance_id IS NULL AND id IN (${placeholders})`,
                [...ids]
            );
            await logActivity(req, 'SUPERADMIN_LOGS_DELETED_BULK', null, null, `${result.rowCount} journaux sélectionnés supprimés.`);
            res.json({ message: `${result.rowCount} enregistrement(s) supprimé(s).` });
        }));

        // --- TEACHER ROUTES ---
        app.get('/api/teachers', authenticateToken, requirePermission('settings:manage_teachers'), asyncHandler(async (req, res) => {
            const { rows } = await req.db.query(`
                SELECT t.*, u.username
                FROM teachers t
                JOIN users u ON t.user_id = u.id
                WHERE t.instance_id = $1
            `, [req.user.instance_id]);
            res.json(rows);
        }));

        app.post('/api/teachers', authenticateToken, requirePermission('settings:manage_teachers'), asyncHandler(async (req, res) => {
            const { nom, prenom, email, phone, nif } = req.body;

            if (!nom || !prenom || !email || !phone || !nif) {
                return res.status(400).json({ message: 'Tous les champs (Prénom, Nom, Email, Téléphone, NIF) sont obligatoires.' });
            }

            const username = (prenom.charAt(0) + nom).toLowerCase().replace(/\s+/g, '');
            const tempPassword = generateTempPassword();
            const hashedPassword = bcrypt.hashSync(tempPassword, 10);
            
            const { rows: existingUserRows } = await req.db.query('SELECT * FROM users WHERE username = $1 AND instance_id = $2', [username, req.user.instance_id]);
            if (existingUserRows.length > 0) return res.status(409).json({ message: `Le nom d'utilisateur '${username}' existe déjà. Essayez avec un autre nom.` });
            
            const { rows: existingTeacherRows } = await req.db.query('SELECT * FROM teachers WHERE email = $1 AND instance_id = $2', [email, req.user.instance_id]);
            if (existingTeacherRows.length > 0) return res.status(409).json({ message: `L'email '${email}' est déjà utilisé.` });
            
            const client = await req.db.connect();
            try {
                await client.query('BEGIN');
                
                const userResult = await client.query('INSERT INTO users (username, password_hash, role, instance_id) VALUES ($1, $2, $3, $4) RETURNING id', [username, hashedPassword, 'teacher', req.user.instance_id]);
                const userId = userResult.rows[0].id;
                
                const teacherResult = await client.query('INSERT INTO teachers (nom, prenom, email, phone, nif, user_id, instance_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id', [formatLastName(nom), formatName(prenom), email, phone, nif, userId, req.user.instance_id]);
                const teacherId = teacherResult.rows[0].id;

                await client.query('UPDATE users SET teacher_id = $1 WHERE id = $2', [teacherId, userId]);
                
                await client.query('COMMIT');

                const { rows: newTeacherRows } = await client.query('SELECT t.*, u.username FROM teachers t JOIN users u ON t.user_id = u.id WHERE t.id = $1', [teacherId]);
                await logActivity(req, 'TEACHER_CREATED', teacherId.toString(), `${newTeacherRows[0].prenom} ${newTeacherRows[0].nom}`, `Profil enseignant créé pour ${newTeacherRows[0].prenom} ${newTeacherRows[0].nom} (ID: ${teacherId}).`);
                res.status(201).json({ teacher: newTeacherRows[0], username, tempPassword });

            } catch (error) {
                await client.query('ROLLBACK');
                if (error.code === '23505') { // unique_violation
                    res.status(409).json({ message: 'Une erreur de conflit est survenue (email ou nom d\'utilisateur déjà pris).' });
                } else {
                    throw error;
                }
            } finally {
                client.release();
            }
        }));

        app.put('/api/teachers/:id', authenticateToken, requirePermission('settings:manage_teachers'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { nom, prenom, email, phone, nif } = req.body;
            const instanceId = req.user.instance_id;
        
            if (!nom || !prenom || !email || !phone || !nif) {
                return res.status(400).json({ message: 'Tous les champs sont obligatoires.' });
            }
        
            const { rows: existingTeacherRows } = await req.db.query('SELECT * FROM teachers WHERE id = $1 AND instance_id = $2', [id, instanceId]);
            if (existingTeacherRows.length === 0) {
                return res.status(404).json({ message: 'Professeur non trouvé.' });
            }
            const existingTeacher = existingTeacherRows[0];
        
            if (email.toLowerCase() !== existingTeacher.email.toLowerCase()) {
                const { rows: emailConflictRows } = await req.db.query('SELECT id FROM teachers WHERE email = $1 AND instance_id = $2 AND id != $3', [email, instanceId, id]);
                if (emailConflictRows.length > 0) {
                    return res.status(409).json({ message: `L'email '${email}' est déjà utilisé par un autre professeur.` });
                }
            }
        
            const { rows: updatedTeacherRows } = await req.db.query(
                'UPDATE teachers SET nom = $1, prenom = $2, email = $3, phone = $4, nif = $5 WHERE id = $6 RETURNING *',
                [formatLastName(nom), formatName(prenom), email, phone, nif, id]
            );
            const updatedTeacher = updatedTeacherRows[0];
            
            const { rows: userRows } = await req.db.query('SELECT username FROM users WHERE id = $1', [updatedTeacher.user_id]);
            updatedTeacher.username = userRows[0]?.username || '';
        
            await logActivity(req, 'TEACHER_UPDATED', id, `${updatedTeacher.prenom} ${updatedTeacher.nom}`, `Profil de l'enseignant ${updatedTeacher.prenom} ${updatedTeacher.nom} (ID: ${id}) mis à jour.`);
        
            res.json(updatedTeacher);
        }));

        app.put('/api/teachers/:id/reset-password', authenticateToken, requirePermission('settings:manage_teachers'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { rows } = await req.db.query('SELECT * FROM teachers WHERE id = $1 AND instance_id = $2', [id, req.user.instance_id]);
            const teacher = rows[0];
            if (!teacher) return res.status(404).json({ message: 'Professeur non trouvé.' });

            const tempPassword = generateTempPassword();
            const hashedPassword = bcrypt.hashSync(tempPassword, 10);

            await req.db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, teacher.user_id]);
            await logActivity(req, 'TEACHER_PASSWORD_RESET', id.toString(), `${teacher.prenom} ${teacher.nom}`, `Mot de passe réinitialisé pour l'enseignant ${teacher.prenom} ${teacher.nom} (ID: ${id}).`);
            
            res.json({ tempPassword });
        }));

        app.delete('/api/teachers/:id', authenticateToken, requirePermission('settings:manage_teachers'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { rows } = await req.db.query('SELECT * FROM teachers WHERE id = $1 AND instance_id = $2', [id, req.user.instance_id]);
            const teacher = rows[0];
            if (!teacher) return res.status(404).json({ message: 'Professeur non trouvé.'});
            
            await req.db.query('DELETE FROM teachers WHERE id = $1', [id]);
            await logActivity(req, 'TEACHER_DELETED', id.toString(), `${teacher.prenom} ${teacher.nom}`, `Profil enseignant supprimé pour ${teacher.prenom} ${teacher.nom} (ID: ${id}).`);
            res.json({ message: 'Professeur et compte utilisateur associé supprimés.'});
        }));
        
        // --- TEACHER ASSIGNMENT & DASHBOARD ROUTES ---
        app.get('/api/teacher/dashboard', authenticateToken, isTeacher, asyncHandler(async (req, res) => {
            const { yearId } = req.query;
            if (!yearId) return res.status(400).json({ message: "L'année scolaire est requise." });
            
            const { rows: teacherRows } = await req.db.query('SELECT id FROM teachers WHERE user_id = $1', [req.user.id]);
            const teacher = teacherRows[0];
            if (!teacher) return res.status(404).json({ message: 'Profil professeur non trouvé.' });
            
            const query = `
                SELECT ta.class_name, ta.subject_id, s.name as subject_name
                FROM teacher_assignments ta
                JOIN subjects s ON ta.subject_id = s.id
                WHERE ta.teacher_id = $1 AND ta.year_id = $2
                ORDER BY ta.class_name, s.name
            `;
            const { rows } = await req.db.query(query, [teacher.id, yearId]);
            res.json(rows);
        }));

        app.get('/api/teacher/assignment', authenticateToken, isTeacher, asyncHandler(async (req, res) => {
            const { yearId, className, subjectId } = req.query;
            if (!yearId || !className || !subjectId) return res.status(400).json({ message: "Paramètres manquants." });
            
            const { rows: teacherRows } = await req.db.query('SELECT id FROM teachers WHERE user_id = $1', [req.user.id]);
            const teacher = teacherRows[0];
            if (!teacher) return res.status(404).json({ message: 'Profil professeur non trouvé.' });

            const { rows } = await req.db.query(
                'SELECT id FROM teacher_assignments WHERE teacher_id = $1 AND year_id = $2 AND class_name = $3 AND subject_id = $4',
                [teacher.id, yearId, className, subjectId]
            );

            if (rows.length === 0) return res.status(404).json({ message: 'Assignation non trouvée.' });
            res.json(rows[0] || {});
        }));

        app.get('/api/teacher/class-roster', authenticateToken, isTeacher, asyncHandler(async (req, res) => {
            const { className, yearId } = req.query;
            const query = `
                SELECT e.*, s.nom, s.prenom, s.photo_url
                FROM enrollments e
                JOIN students s ON e.student_id = s.id
                WHERE e."className" = $1 AND e.year_id = $2 AND s.status = 'active' AND s.instance_id = $3
                ORDER BY s.nom, s.prenom
            `;
            const { rows } = await req.db.query(query, [className, yearId, req.user.instance_id]);
            res.json(rows.map(e => ({...e, student: { nom: e.nom, prenom: e.prenom, photo_url: e.photo_url }})));
        }));
        
        app.get('/api/teacher/subject-details', authenticateToken, isTeacher, asyncHandler(async (req, res) => {
            const { yearId, className, subjectId, periodId } = req.query;
            if (!yearId || !className || !subjectId || !periodId) {
                return res.status(400).json({ message: "Paramètres (année, classe, matière, période) requis." });
            }

            const { rows: classSubjectRows } = await req.db.query(`
                SELECT cs.max_grade 
                FROM class_subjects cs
                JOIN school_years sy ON cs.year_id = sy.id
                WHERE cs.year_id = $1 AND cs.class_name = $2 AND cs.subject_id = $3 AND sy.instance_id = $4
            `, [yearId, className, subjectId, req.user.instance_id]);
            const classSubject = classSubjectRows[0];

            if (!classSubject) return res.status(404).json({ message: "Cette matière n'est pas enseignée dans cette classe." });

            const rosterQuery = `
                SELECT e.*, s.nom, s.prenom, s.photo_url
                FROM enrollments e
                JOIN students s ON e.student_id = s.id
                WHERE e."className" = $1 AND e.year_id = $2 AND s.status = 'active' AND s.instance_id = $3
                ORDER BY s.nom, s.prenom
            `;
            const { rows: roster } = await req.db.query(rosterQuery, [className, yearId, req.user.instance_id]);

            const enrollmentIds = roster.map(r => r.id);
            if (enrollmentIds.length === 0) {
                return res.json({ maxGrade: classSubject.max_grade, gradesByEnrollment: {}, appreciationsByEnrollment: {} });
            }
            
            const gradesQuery = `SELECT * FROM grades WHERE subject_id = $1 AND period_id = $2 AND enrollment_id = ANY($3::int[])`;
            const { rows: allGrades } = await req.db.query(gradesQuery, [subjectId, periodId, enrollmentIds]);

            const appreciationsQuery = `SELECT enrollment_id, text FROM appreciations WHERE subject_id = $1 AND period_id = $2 AND enrollment_id = ANY($3::int[])`;
            const { rows: allAppreciations } = await req.db.query(appreciationsQuery, [subjectId, periodId, enrollmentIds]);
            
            const gradesByEnrollment = allGrades.reduce((acc, grade) => {
                const key = grade.enrollment_id;
                if (!acc[key]) acc[key] = [];
                acc[key].push(grade);
                return acc;
            }, {});

            const appreciationsByEnrollment = allAppreciations.reduce((acc, appreciation) => {
                acc[appreciation.enrollment_id] = appreciation.text;
                return acc;
            }, {});

            res.json({
                maxGrade: classSubject.max_grade,
                gradesByEnrollment,
                appreciationsByEnrollment
            });
        }));

        app.get('/api/curriculum-for-assignment', authenticateToken, requirePermission('settings:manage_teachers'), asyncHandler(async(req, res) => {
             const { rows } = await req.db.query(`
                SELECT cs.class_name, s.id as subject_id, s.name as subject_name 
                FROM class_subjects cs
                JOIN subjects s ON cs.subject_id = s.id
                JOIN school_years sy ON cs.year_id = sy.id
                WHERE cs.year_id = $1 AND sy.instance_id = $2
                ORDER BY cs.class_name, s.name
            `, [req.query.yearId, req.user.instance_id]);
            
            const structuredCurriculum = rows.reduce((acc, { class_name, subject_id, subject_name }) => {
                let classEntry = acc.find(c => c.className === class_name);
                if (!classEntry) {
                    classEntry = { className: class_name, subjects: [] };
                    acc.push(classEntry);
                }
                classEntry.subjects.push({ id: subject_id, name: subject_name });
                return acc;
            }, []);
            
            res.json(structuredCurriculum);
        }));
        
        app.get('/api/teacher-assignments', authenticateToken, requirePermission('settings:manage_teachers'), asyncHandler(async (req, res) => {
            const { teacherId, yearId } = req.query;
            const { rows } = await req.db.query(`
                SELECT ta.* 
                FROM teacher_assignments ta
                JOIN teachers t ON ta.teacher_id = t.id
                WHERE ta.teacher_id = $1 AND ta.year_id = $2 AND t.instance_id = $3
            `, [teacherId, yearId, req.user.instance_id]);
            res.json(rows);
        }));

        app.post('/api/teacher-assignments/bulk-update', authenticateToken, requirePermission('settings:manage_teachers'), asyncHandler(async (req, res) => {
            const { teacherId, yearId, assignments } = req.body; // assignments is [{ className, subjectId }]

            // Security Check
            const { rowCount } = await req.db.query('SELECT 1 FROM teachers WHERE id = $1 AND instance_id = $2', [teacherId, req.user.instance_id]);
            if (rowCount === 0) return res.status(403).json({ message: 'Accès refusé.' });

            const client = await req.db.connect();
            try {
                await client.query('BEGIN');

                // 1. Get current assignments from DB
                const { rows: currentAssignments } = await client.query(
                    'SELECT id, class_name, subject_id FROM teacher_assignments WHERE teacher_id = $1 AND year_id = $2',
                    [teacherId, yearId]
                );

                // 2. Create sets for easy comparison
                const currentAssignmentKeys = new Set(currentAssignments.map(a => `${a.class_name}:${a.subject_id}`));
                const newAssignmentKeys = new Set(assignments.map((a) => `${a.className}:${a.subjectId}`));

                // 3. Find assignments to delete (present in old, not in new)
                const assignmentsToDelete = currentAssignments.filter(a => !newAssignmentKeys.has(`${a.class_name}:${a.subject_id}`));
                const idsToDelete = assignmentsToDelete.map(a => a.id);

                // 4. Find assignments to add (present in new, not in old)
                const assignmentsToAdd = assignments.filter((a) => !currentAssignmentKeys.has(`${a.className}:${a.subjectId}`));

                // 5. Execute DELETE operations
                if (idsToDelete.length > 0) {
                    const placeholders = idsToDelete.map((_, i) => `$${i + 1}`).join(',');
                    await client.query(`DELETE FROM teacher_assignments WHERE id IN (${placeholders})`, idsToDelete);
                }

                // 6. Execute INSERT operations
                if (assignmentsToAdd.length > 0) {
                    const values = [];
                    let paramIndex = 1;
                    const valueStrings = assignmentsToAdd.map((a) => {
                        values.push(teacherId, yearId, a.className, a.subjectId);
                        const placeholder = `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`;
                        return placeholder;
                    });

                    const insertQuery = `INSERT INTO teacher_assignments (teacher_id, year_id, class_name, subject_id) VALUES ${valueStrings.join(',')}`;
                    await client.query(insertQuery, values);
                }

                await client.query('COMMIT');
                res.status(200).json({ message: 'Assignations mises à jour avec succès.' });

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        }));

        // --- ATTENDANCE ROUTES ---
        app.get('/api/attendance', authenticateToken, isTeacher, asyncHandler(async (req, res) => {
            const { enrollmentIds, subjectId, date } = req.query;
            if (!enrollmentIds || !subjectId || !date) return res.status(400).json({ message: 'Paramètres manquants.' });
            
            const ids = enrollmentIds.split(',').map(Number);
            if (ids.length === 0) {
                return res.json([]);
            }

            // Security check: ensure all enrollments belong to the user's instance
            const { rows: checkRows } = await req.db.query(`
                SELECT COUNT(e.id) as count
                FROM enrollments e
                JOIN students s ON e.student_id = s.id
                WHERE e.id = ANY($1::int[]) AND s.instance_id != $2
            `, [ids, req.user.instance_id]);

            if (checkRows[0].count > 0) return res.status(403).json({ message: 'Accès non autorisé à certaines inscriptions.' });

            const query = `
                SELECT enrollment_id, status FROM attendance
                WHERE subject_id = $1 AND date = $2 AND enrollment_id = ANY($3::int[])
            `;
            const { rows } = await req.db.query(query, [subjectId, date, ids]);
            res.json(rows);
        }));

        app.post('/api/attendance/bulk-update', authenticateToken, isTeacher, asyncHandler(async (req, res) => {
            const { subjectId, date, records } = req.body; // records is [{ enrollment_id, status }]
            const { id: userId, role } = req.user;

            const { rows: teacherRows } = await req.db.query('SELECT id FROM teachers WHERE user_id = $1', [userId]);
            const teacher = teacherRows[0];
            if (!teacher && role !== 'admin') return res.status(403).json({ message: 'Profil professeur non trouvé.' });

            const client = await req.db.connect();
            try {
                await client.query('BEGIN');
                const query = `
                    INSERT INTO attendance (enrollment_id, date, status, subject_id, teacher_id) 
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT(enrollment_id, date, subject_id) DO UPDATE SET status = EXCLUDED.status, teacher_id = EXCLUDED.teacher_id`;
                
                for (const record of records) {
                    await client.query(query, [record.enrollment_id, date, record.status, subjectId, teacher.id]);
                }
                await client.query('COMMIT');
                res.status(200).json({ message: 'Feuille d\'appel mise à jour.' });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        }));
        
        // --- ADMIN ATTENDANCE REPORT ---
        app.get('/api/attendance-report', authenticateToken, requirePermission('report:attendance'), asyncHandler(async (req, res) => {
            const { yearId, className, startDate, endDate } = req.query;
            if (!yearId || !className || !startDate || !endDate) {
                return res.status(400).json({ message: "Année, classe et plage de dates sont requises." });
            }

            const enrollmentsQuery = `
                SELECT e.id as enrollment_id, s.id as student_id, s.nom, s.prenom
                FROM enrollments e
                JOIN students s ON e.student_id = s.id
                WHERE e.year_id = $1 AND e."className" = $2 AND s.status = 'active' AND s.instance_id = $3
                ORDER BY s.nom, s.prenom
            `;
            const { rows: enrollments } = await req.db.query(enrollmentsQuery, [yearId, className, req.user.instance_id]);

            if (enrollments.length === 0) {
                return res.json({ students: [], records: [], dates: [] });
            }

            const enrollmentIds = enrollments.map(e => e.enrollment_id);
            const attendanceQuery = `
                SELECT
                    e.student_id,
                    a.date::TEXT as date,
                    a.status,
                    sub.name as subject_name
                FROM attendance a
                JOIN enrollments e ON a.enrollment_id = e.id
                JOIN subjects sub ON a.subject_id = sub.id
                WHERE a.enrollment_id = ANY($1::int[])
                AND a.date >= $2 AND a.date <= $3
            `;
            const { rows: records } = await req.db.query(attendanceQuery, [enrollmentIds, startDate, endDate]);
            
            const studentList = enrollments.map(e => ({ id: e.student_id, nom: e.nom, prenom: e.prenom }));

            const dates = [];
            let currentDate = new Date(startDate);
            const end = new Date(endDate);
            currentDate.setUTCHours(0, 0, 0, 0);
            end.setUTCHours(0, 0, 0, 0);

            while(currentDate <= end) {
                const day = currentDate.getUTCDay();
                if (day !== 0) { // Exclude Sunday (0)
                    dates.push(currentDate.toISOString().split('T')[0]);
                }
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            }

            res.json({ students: studentList, records, dates });
        }));


        // --- SCHOOL YEAR ROUTES ---
        app.get('/api/school-years', authenticateToken, asyncHandler(async (req, res) => {
            const { rows } = await req.db.query('SELECT * FROM school_years WHERE instance_id = $1 ORDER BY name DESC', [req.user.instance_id]);
            res.json(rows);
        }));

        app.post('/api/school-years', authenticateToken, requirePermission('settings:manage_academic'), asyncHandler(async (req, res) => {
            const { name } = req.body;
            const { rows } = await req.db.query('INSERT INTO school_years (name, instance_id) VALUES ($1, $2) RETURNING id', [name, req.user.instance_id]);
            res.status(201).json({ id: rows[0].id, name, is_current: false });
        }));

        app.put('/api/school-years/:id/set-current', authenticateToken, requirePermission('settings:manage_academic'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            const client = await req.db.connect();
            try {
                await client.query('BEGIN');
                await client.query('UPDATE school_years SET is_current = false WHERE instance_id = $1', [req.user.instance_id]);
                await client.query('UPDATE school_years SET is_current = true WHERE id = $1 AND instance_id = $2', [id, req.user.instance_id]);
                await client.query('COMMIT');
                res.json({ message: 'Année scolaire actuelle mise à jour.' });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        }));
        
        app.delete('/api/school-years/:id', authenticateToken, requirePermission('settings:manage_academic'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { rows } = await req.db.query('SELECT * FROM school_years WHERE id = $1 AND instance_id = $2', [id, req.user.instance_id]);
            const year = rows[0];

            if (!year) {
                return res.status(404).json({ message: "Année scolaire non trouvée." });
            }
            if (year.is_current) {
                return res.status(400).json({ message: "Vous ne pouvez pas supprimer l'année scolaire actuelle. Veuillez d'abord définir une autre année comme actuelle." });
            }
            await req.db.query('DELETE FROM school_years WHERE id = $1', [id]);
            res.json({ message: `L'année scolaire et toutes les données associées ont été supprimées.` });
        }));
        
        // --- CLASS DEFINITION ROUTES ---
        app.get('/api/classes', authenticateToken, asyncHandler(async (req, res) => {
            const { rows } = await req.db.query(
                'SELECT * FROM classes WHERE instance_id = $1 ORDER BY order_index ASC', 
                [req.user.instance_id]
            );
            res.json(rows);
        }));

        app.post('/api/classes', authenticateToken, requirePermission('settings:manage_academic'), asyncHandler(async (req, res) => {
            const { name } = req.body;
            if (!name) return res.status(400).json({ message: 'Le nom de la classe est requis.' });

            try {
                const { rows: maxOrder } = await req.db.query('SELECT MAX(order_index) as max_idx FROM classes WHERE instance_id = $1', [req.user.instance_id]);
                const nextOrderIndex = (maxOrder[0].max_idx || 0) + 1;

                const { rows } = await req.db.query(
                    'INSERT INTO classes (name, order_index, instance_id) VALUES ($1, $2, $3) RETURNING *',
                    [name, nextOrderIndex, req.user.instance_id]
                );
                res.status(201).json(rows[0]);
            } catch (error) {
                if (error.code === '23505') { // unique_violation
                    return res.status(409).json({ message: `Une classe avec le nom '${name}' existe déjà.` });
                }
                throw error;
            }
        }));

        // Specific route for ordering must come BEFORE the parameterized route
        app.put('/api/classes/order', authenticateToken, requirePermission('settings:manage_academic'), asyncHandler(async (req, res) => {
            const { orderedIds } = req.body;
            if (!Array.isArray(orderedIds)) return res.status(400).json({ message: 'Données invalides.' });
            
            const client = await req.db.connect();
            try {
                await client.query('BEGIN');
                for (let i = 0; i < orderedIds.length; i++) {
                    const id = orderedIds[i];
                    const order_index = i + 1;
                    await client.query('UPDATE classes SET order_index = $1 WHERE id = $2 AND instance_id = $3', [order_index, id, req.user.instance_id]);
                }
                await client.query('COMMIT');
                res.json({ message: 'Ordre des classes mis à jour.' });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        }));

        app.put('/api/classes/:id', authenticateToken, requirePermission('settings:manage_academic'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { name } = req.body;
            if (!name) return res.status(400).json({ message: 'Le nom de la classe est requis.' });
            
            const client = await req.db.connect();
            try {
                await client.query('BEGIN');

                const { rows: oldClassRows } = await client.query('SELECT name FROM classes WHERE id = $1 AND instance_id = $2', [id, req.user.instance_id]);
                if (oldClassRows.length === 0) {
                    throw { status: 404, message: 'Classe non trouvée.' };
                }
                const oldClassName = oldClassRows[0].name;

                if (oldClassName !== name) {
                    const yearsInInstanceSubquery = `SELECT id FROM school_years WHERE instance_id = $1`;

                    await client.query(`UPDATE enrollments SET "className" = $1 WHERE "className" = $2 AND year_id IN (${yearsInInstanceSubquery})`, [name, oldClassName, req.user.instance_id]);
                    await client.query(`UPDATE class_subjects SET class_name = $1 WHERE class_name = $2 AND year_id IN (${yearsInInstanceSubquery})`, [name, oldClassName, req.user.instance_id]);
                    await client.query(`UPDATE teacher_assignments SET class_name = $1 WHERE class_name = $2 AND year_id IN (${yearsInInstanceSubquery})`, [name, oldClassName, req.user.instance_id]);
                    await client.query('UPDATE students SET classe_ref = $1 WHERE classe_ref = $2 AND instance_id = $3', [name, oldClassName, req.user.instance_id]);
                }
                
                const { rows } = await client.query('UPDATE classes SET name = $1 WHERE id = $2 AND instance_id = $3 RETURNING *', [name, id, req.user.instance_id]);
                
                await client.query('COMMIT');
                res.json(rows[0]);
            } catch (error) {
                await client.query('ROLLBACK');
                if (error.code === '23505') { // unique_violation on classes table
                    return res.status(409).json({ message: 'Une classe avec ce nom existe déjà.' });
                }
                if (error.status) {
                    return res.status(error.status).json({ message: error.message });
                }
                throw error;
            } finally {
                client.release();
            }
        }));

        app.delete('/api/classes/:id', authenticateToken, requirePermission('settings:manage_academic'), asyncHandler(async (req, res) => {
            const { id } = req.params;

            const { rows: classToDeleteRows } = await req.db.query('SELECT name FROM classes WHERE id = $1 AND instance_id = $2', [id, req.user.instance_id]);
            if (classToDeleteRows.length === 0) return res.status(404).json({ message: 'Classe non trouvée.' });
            const className = classToDeleteRows[0].name;

            const checkUsageQuery = `
                SELECT 1 FROM enrollments e JOIN school_years sy ON e.year_id = sy.id WHERE e."className" = $1 AND sy.instance_id = $2 LIMIT 1
            `;
            const { rows: usageRows } = await req.db.query(checkUsageQuery, [className, req.user.instance_id]);
            if (usageRows.length > 0) {
                return res.status(400).json({ message: 'Impossible de supprimer cette classe car des élèves y sont ou y ont été inscrits.' });
            }

            await req.db.query('DELETE FROM classes WHERE id = $1', [id]);
            res.json({ message: `Classe '${className}' supprimée.` });
        }));


        // --- ACADEMIC PERIOD ROUTES ---
        app.get('/api/academic-periods', authenticateToken, asyncHandler(async (req, res) => {
            const { yearId } = req.query;
            if (!yearId) return res.status(400).json({ message: 'Year ID is required.' });
            const { rows } = await req.db.query(`
                SELECT ap.* 
                FROM academic_periods ap
                JOIN school_years sy ON ap.year_id = sy.id
                WHERE ap.year_id = $1 AND sy.instance_id = $2 ORDER BY ap.name
            `, [yearId, req.user.instance_id]);
            res.json(rows);
        }));

        app.post('/api/academic-periods', authenticateToken, requirePermission('settings:manage_academic'), asyncHandler(async (req, res) => {
            const { year_id, name } = req.body;
            if (!year_id || !name) return res.status(400).json({ message: 'Year ID and name are required.' });
            
            const { rowCount } = await req.db.query('SELECT 1 FROM school_years WHERE id = $1 AND instance_id = $2', [year_id, req.user.instance_id]);
            if (rowCount === 0) return res.status(403).json({ message: 'Accès refusé.' });

            try {
                const { rows } = await req.db.query('INSERT INTO academic_periods (year_id, name) VALUES ($1, $2) RETURNING id', [year_id, name]);
                res.status(201).json({ id: rows[0].id, year_id, name });
            } catch (error) {
                if (error.code === '23505') {
                    res.status(409).json({ message: 'Ce nom de période existe déjà pour cette année.' });
                } else { throw error; }
            }
        }));

        app.put('/api/academic-periods/:id', authenticateToken, requirePermission('settings:manage_academic'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { name } = req.body;
            const { rows } = await req.db.query(
                `UPDATE academic_periods ap SET name = $1
                 FROM school_years sy
                 WHERE ap.year_id = sy.id AND ap.id = $2 AND sy.instance_id = $3
                 RETURNING ap.id`,
                [name, id, req.user.instance_id]
            );
            if (rows.length === 0) return res.status(404).json({ message: 'Période non trouvée ou accès refusé.' });
            res.json({ message: 'Période mise à jour.' });
        }));

        app.delete('/api/academic-periods/:id', authenticateToken, requirePermission('settings:manage_academic'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { rows } = await req.db.query(
                `DELETE FROM academic_periods ap
                 USING school_years sy
                 WHERE ap.year_id = sy.id AND ap.id = $1 AND sy.instance_id = $2
                 RETURNING ap.id`,
                [id, req.user.instance_id]
            );
            if (rows.length === 0) return res.status(404).json({ message: 'Période non trouvée ou accès refusé.' });
            res.json({ message: 'Période supprimée.' });
        }));


        // --- SUBJECT ROUTES ---
        app.get('/api/subjects', authenticateToken, isStaff, asyncHandler(async (req, res) => {
            const { rows } = await req.db.query('SELECT * FROM subjects WHERE instance_id = $1 ORDER BY name', [req.user.instance_id]);
            res.json(rows);
        }));

        app.post('/api/subjects', authenticateToken, requirePermission('settings:manage_academic'), asyncHandler(async (req, res) => {
            const { name } = req.body;
            if (!name) return res.status(400).json({ message: 'Le nom de la matière est requis.' });
            try {
                const { rows } = await req.db.query('INSERT INTO subjects (name, instance_id) VALUES ($1, $2) RETURNING id', [name, req.user.instance_id]);
                res.status(201).json({ id: rows[0].id, name });
            } catch (error) {
                if (error.code === '23505') {
                    res.status(409).json({ message: 'Cette matière existe déjà.' });
                } else { throw error; }
            }
        }));
        
        app.put('/api/subjects/:id', authenticateToken, requirePermission('settings:manage_academic'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { name } = req.body;
            if (!name) return res.status(400).json({ message: 'Le nom de la matière est requis.' });
            const { rowCount } = await req.db.query('UPDATE subjects SET name = $1 WHERE id = $2 AND instance_id = $3', [name, id, req.user.instance_id]);
            if (rowCount === 0) return res.status(404).json({ message: 'Matière non trouvée ou accès refusé.' });
            res.json({ message: 'Matière mise à jour.' });
        }));
        
        app.delete('/api/subjects/:id', authenticateToken, requirePermission('settings:manage_academic'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { rowCount } = await req.db.query('DELETE FROM subjects WHERE id = $1 AND instance_id = $2', [id, req.user.instance_id]);
            if (rowCount === 0) return res.status(404).json({ message: 'Matière non trouvée ou accès refusé.' });
            res.json({ message: 'Matière supprimée.' });
        }));

        // --- CURRICULUM ROUTES (Class Subjects) ---
        app.get('/api/curriculum', authenticateToken, isStaff, asyncHandler(async (req, res) => {
            const { yearId, className } = req.query;
            if (!yearId || !className) return res.status(400).json({ message: 'Year ID and Class Name are required.' });
            
            const { rows: allSubjects } = await req.db.query('SELECT * FROM subjects WHERE instance_id = $1 ORDER BY name', [req.user.instance_id]);
            const assignedSubjectsQuery = `
                SELECT s.name as subject_name, cs.* FROM class_subjects cs
                JOIN subjects s ON s.id = cs.subject_id
                WHERE cs.year_id = $1 AND cs.class_name = $2
                ORDER BY s.name
            `;
            const { rows: assignedSubjects } = await req.db.query(assignedSubjectsQuery, [yearId, className]);

            if (req.user.role === 'teacher') {
                const { rows: teacherRows } = await req.db.query('SELECT id FROM teachers WHERE user_id = $1', [req.user.id]);
                const teacher = teacherRows[0];
                const { rows: teacherAssignments } = await req.db.query('SELECT subject_id FROM teacher_assignments WHERE teacher_id = $1 AND year_id = $2 AND class_name = $3', [teacher.id, yearId, className]);
                const teacherAssignedIds = new Set(teacherAssignments.map(a => a.subject_id));
                
                const filteredAssignedSubjects = assignedSubjects.filter(s => teacherAssignedIds.has(s.subject_id));

                return res.json({ assigned: filteredAssignedSubjects, available: [] });
            }
            
            const assignedIds = new Set(assignedSubjects.map(s => s.subject_id));
            const availableSubjects = allSubjects.filter(s => !assignedIds.has(s.id));
            
            res.json({ assigned: assignedSubjects, available: availableSubjects });
        }));

        app.post('/api/curriculum/assign', authenticateToken, requirePermission('settings:manage_academic'), asyncHandler(async (req, res) => {
            const { yearId, className, subjectId } = req.body;
            if (!yearId || !className || !subjectId) return res.status(400).json({ message: 'Year ID, Class Name, and Subject ID are required.' });
            
            const { rowCount } = await req.db.query('SELECT 1 FROM school_years WHERE id = $1 AND instance_id = $2', [yearId, req.user.instance_id]);
            if (rowCount === 0) return res.status(403).json({ message: 'Accès refusé.' });

            try {
                await req.db.query('INSERT INTO class_subjects (year_id, class_name, subject_id, max_grade) VALUES ($1, $2, $3, 100)', [yearId, className, subjectId]);
                res.status(201).json({ message: 'Subject assigned successfully.' });
            } catch (error) {
                 if (error.code === '23505') {
                    res.status(200).json({ message: 'Subject already assigned.' });
                } else { throw error; }
            }
        }));

        app.post('/api/curriculum/unassign', authenticateToken, requirePermission('settings:manage_academic'), asyncHandler(async (req, res) => {
            const { yearId, className, subjectId } = req.body;
            if (!yearId || !className || !subjectId) return res.status(400).json({ message: 'Year ID, Class Name, and Subject ID are required.' });
            
            const { rowCount } = await req.db.query('SELECT 1 FROM school_years WHERE id = $1 AND instance_id = $2', [yearId, req.user.instance_id]);
            if (rowCount === 0) return res.status(403).json({ message: 'Accès refusé.' });

            await req.db.query('DELETE FROM class_subjects WHERE year_id = $1 AND class_name = $2 AND subject_id = $3', [yearId, className, subjectId]);
            res.json({ message: 'Subject unassigned successfully.' });
        }));

        app.put('/api/curriculum/max-grade/:id', authenticateToken, requirePermission('settings:manage_academic'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { max_grade } = req.body;
            if (max_grade === undefined || isNaN(parseFloat(max_grade)) || parseFloat(max_grade) < 0) {
                return res.status(400).json({ message: "La note maximale est invalide." });
            }
            const { rows } = await req.db.query(
                `UPDATE class_subjects cs SET max_grade = $1
                 FROM school_years sy
                 WHERE cs.year_id = sy.id AND cs.id = $2 AND sy.instance_id = $3
                 RETURNING cs.id`,
                [max_grade, id, req.user.instance_id]
            );
            if (rows.length === 0) return res.status(404).json({ message: 'Programme non trouvé ou accès refusé.'});
            res.json({ message: 'Note maximale mise à jour.' });
        }));

        // --- GRADE ROUTES ---
        const isAssignedToSubject = asyncHandler(async (req, res, next) => {
            if (req.user.role === 'admin') return next();
            if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Accès non autorisé.' });

            const { rows: teacherRows } = await req.db.query('SELECT id FROM teachers WHERE user_id = $1', [req.user.id]);
            const teacher = teacherRows[0];
            if (!teacher) return res.status(403).json({ message: 'Profil professeur non trouvé.' });

            let enrollmentId, subjectId;
            if (req.params.id) {
                const { rows: gradeRows } = await req.db.query('SELECT enrollment_id, subject_id FROM grades WHERE id = $1', [req.params.id]);
                const grade = gradeRows[0];
                if (!grade) return res.status(404).json({ message: 'Note non trouvée.' });
                enrollmentId = grade.enrollment_id;
                subjectId = grade.subject_id;
            } else {
                enrollmentId = req.body.enrollment_id;
                subjectId = req.body.subject_id;
            }

            if (!enrollmentId || !subjectId) return res.status(400).json({ message: 'ID d\'inscription ou de matière manquant.' });
            
            const { rows: enrollmentRows } = await req.db.query('SELECT "className", year_id FROM enrollments WHERE id = $1', [enrollmentId]);
            const enrollment = enrollmentRows[0];
            if (!enrollment) return res.status(404).json({ message: 'Inscription non trouvée.' });
            
            const { rows: assignmentRows } = await req.db.query('SELECT id FROM teacher_assignments WHERE teacher_id = $1 AND class_name = $2 AND subject_id = $3 AND year_id = $4', [teacher.id, enrollment.className, subjectId, enrollment.year_id]);
            if (assignmentRows.length > 0) return next();
            
            return res.status(403).json({ message: 'Accès refusé. Vous n\'êtes pas assigné à cette matière.' });
        });
        
        const canManageGrades = (req, res, next) => {
            if (req.user.role === 'admin' || (req.user.permissions && req.user.permissions.includes('grade:create'))) {
                return next();
            }
            return isAssignedToSubject(req, res, next);
        };

        app.get('/api/grades', authenticateToken, isStaff, asyncHandler(async (req, res) => {
            const { enrollmentId, subjectId, periodId } = req.query;

            if (!enrollmentId || !periodId) return res.status(400).json({ message: 'Enrollment ID et Period ID sont requis.' });

            const { rowCount } = await req.db.query('SELECT 1 FROM enrollments e JOIN students s ON e.student_id = s.id WHERE e.id = $1 AND s.instance_id = $2', [enrollmentId, req.user.instance_id]);
            if (rowCount === 0) return res.status(403).json({ message: 'Accès non autorisé.'});
            
            let query = 'SELECT * FROM grades WHERE enrollment_id = $1 AND period_id = $2';
            const params = [enrollmentId, periodId];

            if (subjectId) {
                query += ' AND subject_id = $3 ORDER BY date DESC';
                params.push(subjectId);
                const { rows } = await req.db.query(query, params);
                return res.json(rows);
            }
            
            const { rows: allGrades } = await req.db.query(query, params);
            let gradesToReturn = allGrades;

            if (req.user.role === 'teacher') {
                const { rows: teacherRows } = await req.db.query('SELECT id FROM teachers WHERE user_id = $1', [req.user.id]);
                const { rows: enrollmentRows } = await req.db.query('SELECT "className", year_id FROM enrollments WHERE id = $1', [enrollmentId]);
                const teacher = teacherRows[0];
                const enrollment = enrollmentRows[0];
                
                if (teacher && enrollment) {
                    const { rows: assignments } = await req.db.query('SELECT subject_id FROM teacher_assignments WHERE teacher_id = $1 AND year_id = $2 AND class_name = $3', [teacher.id, enrollment.year_id, enrollment.className]);
                    const assignedSubjectIds = new Set(assignments.map(a => a.subject_id));
                    gradesToReturn = allGrades.filter(g => assignedSubjectIds.has(g.subject_id));
                } else {
                    gradesToReturn = [];
                }
            }

            const groupedGrades = gradesToReturn.reduce((acc, grade) => {
               const key = grade.subject_id;
               if (!acc[key]) acc[key] = [];
               acc[key].push(grade);
               return acc;
            }, {});
            
            return res.json(groupedGrades);
        }));

        app.post('/api/grades', authenticateToken, canManageGrades, asyncHandler(async (req, res) => {
            const { enrollment_id, subject_id, period_id, evaluation_name, score, max_score } = req.body;
            
            if (!enrollment_id || !subject_id || !period_id || !evaluation_name || score === undefined || max_score === undefined) {
                return res.status(400).json({ message: 'Données de note incomplètes.' });
            }
            if (score > max_score || max_score <= 0) {
                return res.status(400).json({ message: "La note ne peut pas être supérieure à son maximum et le maximum doit être positif." });
            }

            const { rows: enrollmentRows } = await req.db.query('SELECT * FROM enrollments e JOIN students s ON e.student_id = s.id WHERE e.id = $1 AND s.instance_id = $2', [enrollment_id, req.user.instance_id]);
            const enrollment = enrollmentRows[0];
            if (!enrollment) return res.status(404).json({ message: "Inscription non trouvée ou accès refusé." });

            const { rows: csRows } = await req.db.query('SELECT max_grade FROM class_subjects WHERE year_id = $1 AND class_name = $2 AND subject_id = $3', [enrollment.year_id, enrollment.className, subject_id]);
            const classSubject = csRows[0];
            if (!classSubject) return res.status(404).json({ message: "Matière non assignée à cette classe." });
            const subjectMaxGrade = classSubject.max_grade;
            
            const { rows: existingGrades } = await req.db.query('SELECT max_score FROM grades WHERE enrollment_id = $1 AND subject_id = $2 AND period_id = $3', [enrollment_id, subject_id, period_id]);
            const currentTotalMaxScore = existingGrades.reduce((sum, g) => sum + parseFloat(g.max_score), 0);
            
            if (currentTotalMaxScore + max_score > subjectMaxGrade) {
                return res.status(400).json({ message: `L'ajout de cette évaluation de ${max_score} points dépasse la note maximale de ${subjectMaxGrade} pour cette matière. Il ne reste que ${subjectMaxGrade - currentTotalMaxScore} points à distribuer.` });
            }

            const date = new Date().toISOString().split('T')[0];
            const { rows } = await req.db.query('INSERT INTO grades (enrollment_id, subject_id, period_id, evaluation_name, score, max_score, date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [enrollment_id, subject_id, period_id, evaluation_name, score, max_score, date]);
            res.status(201).json(rows[0]);
        }));

        app.put('/api/grades/:id', authenticateToken, canManageGrades, asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { evaluation_name, score, max_score } = req.body;
            
            if (score > max_score || max_score <= 0) {
                return res.status(400).json({ message: "La note ne peut pas être supérieure à son maximum et le maximum doit être positif." });
            }
            
            const { rows: gradeRows } = await req.db.query('SELECT * FROM grades WHERE id = $1', [id]);
            const currentGrade = gradeRows[0];
            if (!currentGrade) return res.status(404).json({ message: "Note non trouvée." });

            const { rows: enrollmentRows } = await req.db.query('SELECT * FROM enrollments e JOIN students s ON e.student_id = s.id WHERE e.id = $1 AND s.instance_id = $2', [currentGrade.enrollment_id, req.user.instance_id]);
            const enrollment = enrollmentRows[0];
            if (!enrollment) return res.status(404).json({ message: "Inscription non trouvée ou accès refusé." });

            const { rows: csRows } = await req.db.query('SELECT max_grade FROM class_subjects WHERE year_id = $1 AND class_name = $2 AND subject_id = $3', [enrollment.year_id, enrollment.className, currentGrade.subject_id]);
            const classSubject = csRows[0];
            if (!classSubject) return res.status(404).json({ message: "Matière non assignée à cette classe." });
            const subjectMaxGrade = Number(classSubject.max_grade);
            
            const newMaxScore = Number(max_score);
            const oldMaxScore = Number(currentGrade.max_score);

            // Only perform the max score check if the max_score is being increased.
            // This allows editing the name or score of a grade even if the total is already at the limit.
            if (newMaxScore > oldMaxScore) {
                const { rows: otherGrades } = await req.db.query('SELECT max_score FROM grades WHERE enrollment_id = $1 AND subject_id = $2 AND period_id = $3 AND id != $4', [currentGrade.enrollment_id, currentGrade.subject_id, currentGrade.period_id, id]);
                const totalUsedByOthers = otherGrades.reduce((sum, g) => sum + Number(g.max_score), 0);

                if ((totalUsedByOthers + newMaxScore) > (subjectMaxGrade + 0.001)) { // Use an epsilon for float comparison
                    return res.status(400).json({ message: `La modification de cette évaluation dépasse la note maximale de ${subjectMaxGrade} pour cette matière. Il ne reste que ${subjectMaxGrade - totalUsedByOthers} points disponibles.` });
                }
            }
            
            const { rows: updatedRows } = await req.db.query('UPDATE grades SET evaluation_name = $1, score = $2, max_score = $3 WHERE id = $4 RETURNING *', [evaluation_name, score, max_score, id]);
            res.json(updatedRows[0]);
        }));

        app.delete('/api/grades/:id', authenticateToken, canManageGrades, asyncHandler(async (req, res) => {
            const { id } = req.params;
             const { rowCount } = await req.db.query(`
                DELETE FROM grades g USING enrollments e, students s 
                WHERE g.enrollment_id = e.id AND e.student_id = s.id 
                AND g.id = $1 AND s.instance_id = $2
            `, [id, req.user.instance_id]);

            if (rowCount === 0) return res.status(404).json({ message: 'Note non trouvée ou non autorisée.' });
            res.status(204).send();
        }));


        // --- STUDENT PROFILE & PORTAL ROUTES ---
        app.get('/api/students-with-enrollment-status', authenticateToken, requirePermission('student:read'), asyncHandler(async (req, res) => {
            const { yearId, includeArchived, classFilter, page = 1, limit = 25 } = req.query;
            if (!yearId) return res.status(400).json({ message: "L'année scolaire est requise." });
        
            const offset = (page - 1) * limit;
        
            const params = [yearId, req.user.instance_id];
            let paramIndex = 3;
        
            let conditions = [`s.instance_id = $2`];
        
            if (includeArchived !== 'true') {
              conditions.push(`s.status = 'active'`);
            }
        
            if (classFilter && classFilter !== 'all') {
                conditions.push(`e."className" = $${paramIndex++}`);
                params.push(classFilter);
            }
        
            let whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
            const baseQuery = `
                FROM students s
                LEFT JOIN enrollments e ON s.id = e.student_id AND e.year_id = $1
            `;
            
            const countQuery = `SELECT COUNT(DISTINCT s.id) as total ${baseQuery}${whereClause}`;
            const dataQuery = `
                SELECT s.*, e.id as enrollment_id, e."className", e.mppa
                ${baseQuery}
                ${whereClause}
                ORDER BY s.nom, s.prenom
                LIMIT $${paramIndex++} OFFSET $${paramIndex++}
            `;
            
            const countParams = [...params]; // Create a copy for the count query
            const dataParams = [...params, limit, offset]; // Add pagination params for the data query
        
            const [countResult, dataResult] = await Promise.all([
                req.db.query(countQuery, countParams),
                req.db.query(dataQuery, dataParams)
            ]);
            
            const total = parseInt(countResult.rows[0].total, 10);
            const students = dataResult.rows.map(s => ({ ...s, enrollment: s.enrollment_id ? { id: s.enrollment_id, className: s.className, mppa: s.mppa } : undefined }));

            res.json({
                students,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            });
        }));
        
        app.post('/api/students/status', authenticateToken, requirePermission('student:archive'), asyncHandler(async (req, res) => {
            const { ids, status } = req.body;
            if (!ids || !Array.isArray(ids) || ids.length === 0 || !['active', 'archived'].includes(status)) {
                return res.status(400).json({ message: 'Données invalides.' });
            }
            const placeholders = ids.map((_, i) => `$${i + 3}`).join(',');
            await req.db.query(`UPDATE students SET status = $1 WHERE id IN (${placeholders}) AND instance_id = $2`, [status, req.user.instance_id, ...ids]);
            
            const actionType = status === 'archived' ? 'STUDENTS_ARCHIVED' : 'STUDENTS_REACTIVATED';
            await logActivity(req, actionType, null, null, `${ids.length} élève(s) ${status === 'archived' ? 'archivés' : 'réactivés'}.`);
            
            res.json({ message: `${ids.length} élève(s) mis à jour avec le statut '${status}'.` });
        }));


        app.post('/api/students', authenticateToken, requirePermission('student:create'), asyncHandler(async (req, res) => {
            const { enrollment, ...profileData } = req.body;
            let { id, nom, prenom, date_of_birth, address, photo_url, tutor_name, tutor_phone, tutor_email, medical_notes, classe_ref, sexe, nisu } = profileData;
            const instance_id = req.user.instance_id;
        
            let finalNisu = nisu ? nisu.toUpperCase() : generateTemporaryNISU({ nom, prenom, sexe, date_of_birth });
        
            if (photo_url) {
                const newPath = await savePhotoFromBase64(photo_url);
                if (newPath) photo_url = newPath;
            }
        
            const insertQuery = `
                INSERT INTO students (id, instance_id, nom, prenom, date_of_birth, address, photo_url, tutor_name, tutor_phone, tutor_email, medical_notes, classe_ref, sexe, nisu) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            `;
            const insertValues = [id, instance_id, formatLastName(nom), formatName(prenom), date_of_birth || null, address, photo_url, tutor_name, tutor_phone, tutor_email, medical_notes, classe_ref || null, sexe || null, finalNisu];

            if (enrollment && enrollment.year_id && enrollment.className && enrollment.mppa >= 0) {
                const client = await req.db.connect();
                try {
                    await client.query('BEGIN');
                    await client.query(insertQuery, insertValues);
                    await logActivity(req, 'STUDENT_CREATED', id, `${formatName(prenom)} ${formatLastName(nom)}`, `Profil élève créé pour ${formatName(prenom)} ${formatLastName(nom)} (ID: ${id}).`);
        
                    const defaultPayments = JSON.stringify(Array(4).fill({ amount: 0, date: null }));
                    const { rows } = await client.query('INSERT INTO enrollments (student_id, year_id, "className", mppa, payments) VALUES ($1, $2, $3, $4, $5) RETURNING id', [id, enrollment.year_id, enrollment.className, enrollment.mppa, defaultPayments]);
                    
                    await logActivity(req, 'STUDENT_ENROLLED', id, `${formatName(prenom)} ${formatLastName(nom)}`, `Élève ${formatName(prenom)} ${formatLastName(nom)} (ID: ${id}) inscrit(e) en classe ${enrollment.className}.`);
        
                    await client.query('COMMIT');
                    res.status(201).json({ id, message: 'Élève créé et inscrit avec succès.' });
                } catch (error) {
                    await client.query('ROLLBACK');
                    throw error;
                } finally {
                    client.release();
                }
            } else {
                await req.db.query(insertQuery, insertValues);
                await logActivity(req, 'STUDENT_CREATED', id, `${formatName(prenom)} ${formatLastName(nom)}`, `Profil élève créé pour ${formatName(prenom)} ${formatLastName(nom)} (ID: ${id}).`);
                res.status(201).json({ id });
            }
        }));

        app.put('/api/students/:id', authenticateToken, requirePermission('student:update'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { mppa, enrollmentId, ...profileData } = req.body;
            const { nom, prenom, date_of_birth, address, photo_url, tutor_name, tutor_phone, tutor_email, medical_notes, classe_ref, sexe, nisu } = profileData;
        
            let finalNisu = nisu ? nisu.toUpperCase() : generateTemporaryNISU({ nom, prenom, sexe, date_of_birth });

            const client = await req.db.connect();
            try {
                await client.query('BEGIN');
        
                const { rows } = await client.query('SELECT photo_url FROM students WHERE id = $1 AND instance_id = $2', [id, req.user.instance_id]);
                if (rows.length === 0) {
                    throw new Error("Élève non trouvé ou accès non autorisé.");
                }
                const currentStudent = rows[0];
                let finalPhotoUrl = currentStudent.photo_url;
        
                if (photo_url && photo_url.startsWith('data:image')) {
                    const newPath = await savePhotoFromBase64(photo_url);
                    if (newPath) {
                        finalPhotoUrl = newPath;
                        if (currentStudent.photo_url && currentStudent.photo_url.startsWith('/uploads/')) {
                            fs.unlink(path.join(__dirname, currentStudent.photo_url), err => {
                                if (err) console.error(`Failed to delete old photo: ${currentStudent.photo_url}`, err);
                            });
                        }
                    }
                } else if (req.body.hasOwnProperty('photo_url') && photo_url === null && currentStudent.photo_url) {
                    finalPhotoUrl = null;
                     if (currentStudent.photo_url.startsWith('/uploads/')) {
                        fs.unlink(path.join(__dirname, currentStudent.photo_url), err => {
                             if (err) console.error(`Failed to delete old photo on removal: ${currentStudent.photo_url}`, err);
                        });
                    }
                }
                
                const query = `
                    UPDATE students 
                    SET nom = $1, prenom = $2, date_of_birth = $3, address = $4, photo_url = $5, 
                        tutor_name = $6, tutor_phone = $7, tutor_email = $8, medical_notes = $9, classe_ref = $10,
                        sexe = $11, nisu = $12
                    WHERE id = $13
                `;
                const values = [
                    formatLastName(nom), formatName(prenom), date_of_birth || null, address, finalPhotoUrl, 
                    tutor_name, tutor_phone, tutor_email, medical_notes, classe_ref || null, sexe || null, finalNisu,
                    id
                ];
                await client.query(query, values);
        
                if (enrollmentId !== null && enrollmentId !== undefined && mppa !== undefined) {
                    await client.query('UPDATE enrollments SET mppa = $1 WHERE id = $2 AND student_id = $3', [mppa, enrollmentId, id]);
                }
                
                await client.query('COMMIT');
                await logActivity(req, 'STUDENT_UPDATED', id, `${formatName(prenom)} ${formatLastName(nom)}`, `Profil élève mis à jour pour ${formatName(prenom)} ${formatLastName(nom)} (ID: ${id}).`);
                res.json({ message: 'Profil élève mis à jour.' });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        }));

        app.post('/api/students/delete', authenticateToken, requirePermission('student:delete'), asyncHandler(async (req, res) => {
            const { ids } = req.body;
            const placeholders = ids.map((_, i) => `$${i + 2}`).join(',');
            
            const { rows: studentsToDelete } = await req.db.query(`SELECT id, prenom, nom, photo_url FROM students WHERE id IN (${placeholders}) AND instance_id = $1`, [req.user.instance_id, ...ids]);
            for (const student of studentsToDelete) {
                await logActivity(req, 'STUDENT_DELETED', student.id, `${student.prenom} ${student.nom}`, `Profil élève supprimé pour ${student.prenom} ${student.nom} (ID: ${student.id}).`);
                if (student.photo_url && student.photo_url.startsWith('/uploads/')) {
                    const photoPath = path.join(__dirname, student.photo_url);
                    fs.unlink(photoPath, (err) => {
                        if (err) console.error(`Failed to delete photo for student ${student.id}: ${photoPath}`, err);
                    });
                }
            }
            await req.db.query(`DELETE FROM students WHERE id IN (${placeholders}) AND instance_id = $1`, [req.user.instance_id, ...ids]);
            res.json({ message: 'Élèves supprimés avec succès.' });
        }));

        app.post('/api/students/create-accounts', authenticateToken, requirePermission('student_portal:manage_accounts'), asyncHandler(async (req, res) => {
            const { yearId, className } = req.body;
            if (!yearId || !className) return res.status(400).json({ message: "Année et classe sont requises." });

            const { rows: students } = await req.db.query(`
                SELECT s.id, s.prenom, s.nom
                FROM students s
                JOIN enrollments e ON s.id = e.student_id
                WHERE e.year_id = $1 AND e."className" = $2 AND s.status = 'active'
                  AND s.id NOT IN (SELECT student_id FROM student_users)
                  AND s.instance_id = $3
            `, [yearId, className, req.user.instance_id]);

            if (students.length === 0) {
                return res.json({ message: "Aucun nouvel élève à qui créer un compte dans cette classe.", credentials: [] });
            }

            const credentials = [];
            for (const student of students) {
                const baseUsername = `${student.prenom.charAt(0)}${student.nom}`.toLowerCase().replace(/[^a-z0-9]/g, '');
                let username = baseUsername;
                let isUnique = false;
                let suffix = 1;

                while (!isUnique) {
                    const { rows } = await req.db.query('SELECT id FROM student_users WHERE username = $1', [username]);
                    if (rows.length === 0) {
                        isUnique = true;
                    } else {
                        username = `${baseUsername}${suffix++}`;
                    }
                }

                const temp_password = generateTempPassword();
                const password_hash = bcrypt.hashSync(temp_password, 10);

                await req.db.query(
                    'INSERT INTO student_users (student_id, username, password_hash, status) VALUES ($1, $2, $3, $4)',
                    [student.id, username, password_hash, 'temporary_password']
                );
                credentials.push({ prenom: student.prenom, nom: student.nom, username, temp_password });
            }

            res.status(201).json({
                message: `${credentials.length} compte(s) élève(s) créé(s) avec succès.`,
                credentials
            });
        }));
        
        app.put('/api/student/change-password', authenticateToken, isStudent, asyncHandler(async (req, res) => {
            const { currentPassword, newPassword } = req.body;
            const { id: studentUserId, username } = req.user;

            const { rows } = await req.db.query('SELECT * FROM student_users WHERE id = $1', [studentUserId]);
            const studentUser = rows[0];

            if (!studentUser || !await bcrypt.compare(currentPassword, studentUser.password_hash)) {
                return res.status(401).json({ message: 'Le mot de passe actuel est incorrect.' });
            }
            const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
            await req.db.query('UPDATE student_users SET password_hash = $1, status = $2 WHERE id = $3', [hashedNewPassword, 'active', studentUserId]);
            
            await logActivity(req, 'STUDENT_PASSWORD_CHANGED', studentUserId, username, 'Mot de passe du portail mis à jour.');
            res.json({ message: 'Mot de passe mis à jour avec succès.' });
        }));
        
        app.get('/api/student/timetable', authenticateToken, isStudent, asyncHandler(async (req, res) => {
            const { yearId } = req.query;
            const { student_id } = req.user;
             if (!yearId || !student_id) return res.status(400).json({ message: "ID de l'année et de l'étudiant requis." });

            // Find enrollment for the student for the given year to get their class
            const { rows: enrollmentRows } = await req.db.query('SELECT "className" FROM enrollments WHERE student_id = $1 AND year_id = $2', [student_id, yearId]);
            if (enrollmentRows.length === 0) {
                return res.json([]); // Not enrolled this year
            }
            const className = enrollmentRows[0].className;
            
            // Get all schedule slots for that class in that year
            const query = `
                SELECT
                    ss.*,
                    ta.class_name,
                    t.id as teacher_id, t.prenom as teacher_prenom, t.nom as teacher_nom,
                    s.id as subject_id, s.name as subject_name,
                    l.name as location_name
                FROM schedule_slots ss
                JOIN teacher_assignments ta ON ss.assignment_id = ta.id
                JOIN teachers t ON ta.teacher_id = t.id
                JOIN subjects s ON ta.subject_id = s.id
                LEFT JOIN locations l ON ss.location_id = l.id
                WHERE ta.year_id = $1 AND ta.class_name = $2
                ORDER BY ss.day_of_week, ss.start_time
            `;
            const { rows } = await req.db.query(query, [yearId, className]);
            res.json(rows);
        }));

        app.get('/api/student/access-status', authenticateToken, isStudent, asyncHandler(async (req, res) => {
            const { yearId } = req.query;
            const { student_id } = req.user;
            if (!yearId || !student_id) return res.status(400).json({ message: "Paramètres manquants." });
            
            const { rows } = await req.db.query(
                'SELECT grades_access_enabled FROM enrollments WHERE student_id = $1 AND year_id = $2',
                [student_id, yearId]
            );

            if (rows.length === 0) {
                // If not enrolled, access is implicitly enabled (page will show "no grades")
                return res.json({ grades_access_enabled: true });
            }
            res.json(rows[0]);
        }));
        
        app.get('/api/student/grades', authenticateToken, isStudent, asyncHandler(async (req, res) => {
            const { yearId } = req.query;
            const { student_id } = req.user;
             if (!yearId || !student_id) return res.status(400).json({ message: "ID de l'année et de l'étudiant requis." });

            const { rows: enrollmentRows } = await req.db.query('SELECT id, "className", grades_access_enabled FROM enrollments WHERE student_id = $1 AND year_id = $2', [student_id, yearId]);
            if (enrollmentRows.length === 0) return res.json([]);
            const { id: enrollment_id, className, grades_access_enabled } = enrollmentRows[0];

            if (!grades_access_enabled) {
                return res.status(403).json({ message: "L'accès à vos notes est actuellement restreint. Veuillez contacter l'administration." });
            }

            const { rows: periods } = await req.db.query('SELECT * FROM academic_periods WHERE year_id = $1 ORDER BY name', [yearId]);
            const { rows: subjects } = await req.db.query('SELECT s.id as subject_id, s.name as subject_name, cs.max_grade FROM class_subjects cs JOIN subjects s ON cs.subject_id = s.id WHERE cs.year_id = $1 AND cs.class_name = $2', [yearId, className]);
            const { rows: allGrades } = await req.db.query('SELECT * FROM grades WHERE enrollment_id = $1', [enrollment_id]);
            const { rows: allAppreciations } = await req.db.query('SELECT * FROM appreciations WHERE enrollment_id = $1', [enrollment_id]);
            const { rows: allGeneralAppreciations } = await req.db.query('SELECT * FROM general_appreciations WHERE enrollment_id = $1', [enrollment_id]);
            
            const results = periods.map(period => {
                const subjectsForPeriod = subjects.map(subject => {
                    const grades = allGrades.filter(g => g.period_id === period.id && g.subject_id === subject.subject_id);
                    const totalScore = grades.reduce((sum, g) => sum + Number(g.score), 0);
                    const totalMaxScore = grades.reduce((sum, g) => sum + Number(g.max_score), 0);
                    const average = totalMaxScore > 0 ? (totalScore / totalMaxScore) * Number(subject.max_grade) : 0;
                    
                    const appreciation = allAppreciations.find(a => a.period_id === period.id && a.subject_id === subject.subject_id)?.text || null;

                    return {
                        subject_id: subject.subject_id,
                        subject_name: subject.subject_name,
                        max_grade: Number(subject.max_grade),
                        average: average,
                        appreciation: appreciation,
                        grades: grades,
                    };
                });

                const totalPeriodMaxGrade = subjectsForPeriod.reduce((sum, s) => sum + Number(s.max_grade), 0);
                const totalPeriodScore = subjectsForPeriod.reduce((sum, s) => sum + Number(s.average), 0);
                 const period_average = totalPeriodMaxGrade > 0 ? (totalPeriodScore / totalPeriodMaxGrade) * 100 : null;

                const general_appreciation = allGeneralAppreciations.find(a => a.period_id === period.id)?.text || null;

                return {
                    period_id: period.id,
                    period_name: period.name,
                    subjects: subjectsForPeriod,
                    period_average: period_average,
                    general_appreciation: general_appreciation,
                };
            });
            
            res.json(results);
        }));

        // --- NEW Student Account Individual Management ---
        app.get('/api/classes/:className/students-with-account-status', authenticateToken, requirePermission('student_portal:manage_accounts'), asyncHandler(async (req, res) => {
            const { className } = req.params;
            const { yearId } = req.query;

            const query = `
                SELECT s.id as student_id, s.nom, s.prenom, su.id as account_id
                FROM students s
                JOIN enrollments e ON s.id = e.student_id
                LEFT JOIN student_users su ON s.id = su.student_id
                WHERE e."className" = $1 AND e.year_id = $2 AND s.status = 'active' AND s.instance_id = $3
                ORDER BY s.nom, s.prenom
            `;
            const { rows } = await req.db.query(query, [className, yearId, req.user.instance_id]);
            res.json(rows);
        }));

        app.post('/api/students/:studentId/create-account', authenticateToken, requirePermission('student_portal:manage_accounts'), asyncHandler(async (req, res) => {
            const { studentId } = req.params;

            const { rows: studentRows } = await req.db.query('SELECT prenom, nom FROM students WHERE id = $1 AND instance_id = $2', [studentId, req.user.instance_id]);
            if (studentRows.length === 0) return res.status(404).json({ message: 'Élève non trouvé.' });
            const student = studentRows[0];
            
            const baseUsername = `${student.prenom.charAt(0)}${student.nom}`.toLowerCase().replace(/[^a-z0-9]/g, '');
            let username = baseUsername;
            let isUnique = false;
            let suffix = 1;

            while (!isUnique) {
                const { rows } = await req.db.query('SELECT id FROM student_users WHERE username = $1', [username]);
                if (rows.length === 0) isUnique = true;
                else username = `${baseUsername}${suffix++}`;
            }

            const temp_password = generateTempPassword();
            const password_hash = bcrypt.hashSync(temp_password, 10);

            await req.db.query(
                'INSERT INTO student_users (student_id, username, password_hash, status) VALUES ($1, $2, $3, $4)',
                [studentId, username, password_hash, 'temporary_password']
            );
            
            await logActivity(req, 'STUDENT_ACCOUNT_CREATED', studentId, `${student.prenom} ${student.nom}`, `Compte portail créé pour l'élève ${student.prenom} ${student.nom} (ID: ${studentId}).`);
            res.status(201).json({ prenom: student.prenom, nom: student.nom, username, temp_password });
        }));

        app.put('/api/students/:studentId/reset-password', authenticateToken, requirePermission('student_portal:manage_accounts'), asyncHandler(async (req, res) => {
            const { studentId } = req.params;
            
            const { rows: studentCheck } = await req.db.query('SELECT id FROM students WHERE id = $1 AND instance_id = $2', [studentId, req.user.instance_id]);
            if (studentCheck.length === 0) return res.status(404).json({ message: 'Élève non trouvé.' });

            const { rows: userRows } = await req.db.query('SELECT * FROM student_users WHERE student_id = $1', [studentId]);
            if (userRows.length === 0) return res.status(404).json({ message: 'Compte élève non trouvé.' });
            const studentUser = userRows[0];
            
            const { rows: studentRows } = await req.db.query('SELECT prenom, nom FROM students WHERE id = $1', [studentId]);
            const student = studentRows[0];

            const temp_password = generateTempPassword();
            const password_hash = bcrypt.hashSync(temp_password, 10);

            await req.db.query(
                'UPDATE student_users SET password_hash = $1, status = $2 WHERE id = $3',
                [password_hash, 'temporary_password', studentUser.id]
            );

            await logActivity(req, 'STUDENT_PASSWORD_RESET', studentId, `${student.prenom} ${student.nom}`, `Mot de passe du portail réinitialisé pour l'élève ${student.prenom} ${student.nom} (ID: ${studentId}).`);
            res.json({ prenom: student.prenom, nom: student.nom, username: studentUser.username, temp_password });
        }));
        
        app.delete('/api/students/:studentId/account', authenticateToken, requirePermission('student_portal:manage_accounts'), asyncHandler(async (req, res) => {
            const { studentId } = req.params;
            
            const { rows } = await req.db.query(
                `DELETE FROM student_users su USING students s 
                 WHERE su.student_id = s.id AND su.student_id = $1 AND s.instance_id = $2
                 RETURNING su.username`, 
                [studentId, req.user.instance_id]
            );
            
            if (rows.length === 0) {
                return res.status(404).json({ message: "Aucun compte à supprimer pour cet élève ou accès refusé." });
            }

            await logActivity(req, 'STUDENT_ACCOUNT_DELETED', studentId, `Compte: ${rows[0].username}`, `Compte portail '${rows[0].username}' supprimé pour l'élève (ID: ${studentId}).`);
            res.json({ message: 'Compte élève supprimé avec succès.' });
        }));


        // --- ENROLLMENT ROUTES ---
        app.get('/api/enrollments', authenticateToken, requirePermission('student:read'), asyncHandler(async (req, res) => {
            const { yearId, className } = req.query;
            if (!yearId || !className) return res.status(400).json({ message: "Année et classe requises." });

            const query = `
                SELECT e.*, s.nom, s.prenom, s.date_of_birth, s.address, s.photo_url, s.tutor_name, s.tutor_phone, s.tutor_email, s.medical_notes
                FROM enrollments e
                JOIN students s ON e.student_id = s.id
                WHERE e.year_id = $1 AND e."className" = $2 AND s.status = 'active' AND s.instance_id = $3
                ORDER BY s.nom, s.prenom
            `;
            const { rows } = await req.db.query(query, [yearId, className, req.user.instance_id]);
            res.json(rows);
        }));
        
        app.get('/api/enrollments/all', authenticateToken, requirePermission('report:financial'), asyncHandler(async (req, res) => {
            const { page = 1, limit = 25, yearId, selectedClasses, balanceFilter, installmentFilter, mppaFilter, searchTerm } = req.query;
            const offset = (page - 1) * limit;

            let params = [req.user.instance_id];
            let conditions = [`s.instance_id = $1`];
            let paramIndex = 2;

            conditions.push(`s.status = 'active'`);
            
            if (yearId) { conditions.push(`e.year_id = $${paramIndex++}`); params.push(yearId); }
            if (selectedClasses) {
                const classes = selectedClasses.split(',');
                if (classes.length > 0) {
                    const placeholders = classes.map(() => `$${paramIndex++}`).join(',');
                    conditions.push(`e."className" IN (${placeholders})`);
                    params.push(...classes);
                }
            }
            if (mppaFilter) { conditions.push(`e.mppa = $${paramIndex++}`); params.push(mppaFilter); }
            if (searchTerm) {
                conditions.push(`(s.nom ILIKE $${paramIndex} OR s.prenom ILIKE $${paramIndex})`);
                params.push(`%${searchTerm}%`);
                paramIndex++;
            }

            if (balanceFilter === 'zero') { conditions.push(`e.mppa <= (SELECT COALESCE(SUM((p->>'amount')::numeric), 0) FROM jsonb_array_elements(e.payments) p)`); }
            if (balanceFilter === 'nonzero') { conditions.push(`e.mppa > (SELECT COALESCE(SUM((p->>'amount')::numeric), 0) FROM jsonb_array_elements(e.payments) p)`); }
            if (installmentFilter && installmentFilter !== 'all') {
                const [version, status] = installmentFilter.split('-');
                const index = parseInt(version.replace('v', ''), 10) - 1;
                if (status === 'paid') {
                    conditions.push(`(e.payments->>${index}->>'amount')::numeric > 0`);
                } else if (status === 'unpaid') {
                    conditions.push(`COALESCE((e.payments->>${index}->>'amount')::numeric, 0) <= 0`);
                }
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const baseQuery = `FROM enrollments e JOIN students s ON e.student_id = s.id JOIN school_years y ON e.year_id = y.id ${whereClause}`;

            const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
            const dataQuery = `
                SELECT e.*, s.nom, s.prenom, y.name as year_name 
                ${baseQuery}
                ORDER BY y.name DESC, s.nom, s.prenom
                LIMIT $${paramIndex++} OFFSET $${paramIndex++}
            `;
            const countParams = [...params];
            const dataParams = [...params, limit, offset];

            const [countResult, dataResult] = await Promise.all([
                req.db.query(countQuery, countParams),
                req.db.query(dataQuery, dataParams)
            ]);

            const total = parseInt(countResult.rows[0].total, 10);
            res.json({
                enrollments: dataResult.rows,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            });
        }));

        app.post('/api/enrollments', authenticateToken, requirePermission('enrollment:create'), asyncHandler(async (req, res) => {
            const { student_id, year_id, className, mppa } = req.body;

            // Security check
            const { rowCount } = await req.db.query('SELECT 1 FROM students WHERE id = $1 AND instance_id = $2', [student_id, req.user.instance_id]);
            if (rowCount === 0) return res.status(403).json({ message: 'Accès non autorisé à cet élève.' });

            const defaultPayments = JSON.stringify(Array(4).fill({ amount: 0, date: null }));
            const { rows } = await req.db.query('INSERT INTO enrollments (student_id, year_id, "className", mppa, payments) VALUES ($1, $2, $3, $4, $5) RETURNING id', [student_id, year_id, className, mppa, defaultPayments]);
            const { rows: studentRows } = await req.db.query('SELECT prenom, nom FROM students WHERE id = $1', [student_id]);
            await logActivity(req, 'STUDENT_ENROLLED', student_id, `${studentRows[0].prenom} ${studentRows[0].nom}`, `Élève ${studentRows[0].prenom} ${studentRows[0].nom} (ID: ${student_id}) inscrit(e) en classe ${className}.`);
            res.status(201).json({ id: rows[0].id });
        }));
        
        app.post('/api/enrollments/bulk', authenticateToken, requirePermission('enrollment:create'), asyncHandler(async (req, res) => {
            const { student_ids, year_id, className, mppa } = req.body;
            if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0 || !year_id || !className || mppa === undefined) {
                return res.status(400).json({ message: "Données d'inscription en masse invalides." });
            }
            
            const defaultPayments = JSON.stringify(Array(4).fill({ amount: 0, date: null }));
            const query = 'INSERT INTO enrollments (student_id, year_id, "className", mppa, payments) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (student_id, year_id) DO NOTHING';

            const client = await req.db.connect();
            try {
                await client.query('BEGIN');
                for (const student_id of student_ids) {
                    // Security check for each student
                    const { rowCount } = await client.query('SELECT 1 FROM students WHERE id = $1 AND instance_id = $2', [student_id, req.user.instance_id]);
                    if (rowCount > 0) {
                        await client.query(query, [student_id, year_id, className, mppa, defaultPayments]);
                    }
                }
                await client.query('COMMIT');
                await logActivity(req, 'STUDENTS_ENROLLED_BULK', null, null, `${student_ids.length} élève(s) inscrit(s) en masse en classe ${className}.`);
                res.status(201).json({ message: `${student_ids.length} élève(s) inscrit(s) avec succès.` });
            } catch(e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        }));

        app.put('/api/enrollments/:id/payments', authenticateToken, requirePermission('enrollment:update_payment'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { payments, mppa } = req.body;
            
            const { rowCount } = await req.db.query(
                `UPDATE enrollments e SET payments = $1, mppa = $2
                 FROM students s
                 WHERE e.student_id = s.id AND e.id = $3 AND s.instance_id = $4`,
                [JSON.stringify(payments), mppa, id, req.user.instance_id]
            );

            if (rowCount === 0) {
                return res.status(404).json({ message: "Inscription non trouvée ou accès non autorisé." });
            }
            
            const { rows } = await req.db.query('SELECT e.student_id, s.nom, s.prenom FROM enrollments e JOIN students s ON e.student_id = s.id WHERE e.id = $1', [id]);
            const enrollment = rows[0];
            if (enrollment) {
                await logActivity(req, 'PAYMENT_UPDATED', enrollment.student_id, `${enrollment.prenom} ${enrollment.nom}`, `Fiche de paiement mise à jour pour ${enrollment.prenom} ${enrollment.nom} (ID: ${enrollment.student_id}).`);
            }

            res.json({ message: 'Paiements mis à jour.' });
        }));
        
        app.put('/api/enrollments/:id/toggle-grades-access', authenticateToken, requirePermission('student_portal:manage_access'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { enabled } = req.body;
            
            const { rows } = await req.db.query(
                `UPDATE enrollments e SET grades_access_enabled = $1
                 FROM students s
                 WHERE e.student_id = s.id AND e.id = $2 AND s.instance_id = $3
                 RETURNING e.student_id`,
                [enabled, id, req.user.instance_id]
            );

            if (rows.length > 0) {
                const studentId = rows[0].student_id;
                const { rows: studentRows } = await req.db.query('SELECT nom, prenom FROM students WHERE id = $1', [studentId]);
                const student = studentRows[0];
                const action = enabled ? 'GRADES_ACCESS_ENABLED' : 'GRADES_ACCESS_DISABLED';
                await logActivity(req, action, studentId, `${student.prenom} ${student.nom}`, `Accès aux notes ${enabled ? 'activé' : 'restreint'} pour ${student.prenom} ${student.nom} (ID: ${studentId}).`);
            }

            res.json({ message: 'Accès aux notes mis à jour.' });
        }));

        app.put('/api/classes/:className/toggle-grades-access', authenticateToken, requirePermission('student_portal:manage_access'), asyncHandler(async (req, res) => {
            const { className } = req.params;
            const { yearId, enabled } = req.body;

            const { rowCount } = await req.db.query(
                `UPDATE enrollments SET grades_access_enabled = $1
                 WHERE "className" = $2 AND year_id = $3
                 AND year_id IN (SELECT id FROM school_years WHERE instance_id = $4)`,
                [enabled, className, yearId, req.user.instance_id]
            );
            
            const action = enabled ? 'GRADES_ACCESS_ENABLED_BULK' : 'GRADES_ACCESS_DISABLED_BULK';
            await logActivity(req, action, null, null, `Accès aux notes ${enabled ? 'activé' : 'restreint'} pour ${rowCount} élève(s) de la classe ${className}.`);

            res.json({ message: `${rowCount} élève(s) mis à jour dans la classe ${className}.` });
        }));


        app.post('/api/enrollments/bulk-change-class', authenticateToken, requirePermission('enrollment:update_class'), asyncHandler(async (req, res) => {
            const { enrollmentIds, targetClassName } = req.body;
            if (!enrollmentIds || !Array.isArray(enrollmentIds) || enrollmentIds.length === 0 || !targetClassName) {
                return res.status(400).json({ message: "Données invalides." });
            }

            const placeholders = enrollmentIds.map((_, i) => `$${i + 3}`).join(',');
            const { rowCount } = await req.db.query(
                `UPDATE enrollments e SET "className" = $1
                 FROM students s
                 WHERE e.student_id = s.id AND s.instance_id = $2 AND e.id IN (${placeholders})`,
                [targetClassName, req.user.instance_id, ...enrollmentIds]
            );

            await logActivity(req, 'STUDENTS_CLASS_CHANGED', null, null, `${rowCount} élève(s) déplacé(s) vers la classe ${targetClassName}.`);

            res.json({ message: `${rowCount} élève(s) déplacé(s) vers la classe ${targetClassName}.` });
        }));

        app.post('/api/promotions', authenticateToken, requirePermission('settings:manage_academic'), asyncHandler(async (req, res) => {
            const { sourceYearId, promotionMap } = req.body;
            const { preview } = req.query;
        
            if (!sourceYearId || !promotionMap) {
                return res.status(400).json({ message: "Année source et plan de promotion requis." });
            }
        
            const { rows: schoolInfoRows } = await req.db.query('SELECT passing_grade FROM instances WHERE id = $1', [req.user.instance_id]);
            const passingGrade = schoolInfoRows[0]?.passing_grade || 60;
        
            const promotionQuery = `
                WITH SubjectAverages AS (
                    SELECT
                        g.enrollment_id,
                        g.subject_id,
                        CASE
                            WHEN SUM(g.max_score) > 0 THEN (SUM(g.score) / SUM(g.max_score)) * 100
                            ELSE 0
                        END as subject_average_percent
                    FROM grades g
                    GROUP BY g.enrollment_id, g.subject_id
                ),
                AnnualAverages AS (
                    SELECT
                        sa.enrollment_id,
                        AVG(sa.subject_average_percent) as annual_average
                    FROM SubjectAverages sa
                    GROUP BY sa.enrollment_id
                )
                SELECT
                    e.student_id,
                    e."className",
                    COALESCE(aa.annual_average, 0) as annual_average
                FROM enrollments e
                LEFT JOIN AnnualAverages aa ON e.id = aa.enrollment_id
                JOIN students s ON e.student_id = s.id
                WHERE e.year_id = $1 AND s.instance_id = $2;
            `;
            
            const { rows: studentResultsFromDb } = await req.db.query(promotionQuery, [sourceYearId, req.user.instance_id]);
            
            const studentResults = studentResultsFromDb.map(r => ({
                student_id: r.student_id,
                className: r.className,
                passed: r.annual_average >= passingGrade
            }));
        
            const summary = {};
            for (const className in promotionMap) {
                summary[className] = { admitted: 0, failed: 0, target: promotionMap[className] };
            }
        
            for (const result of studentResults) {
                if (summary[result.className]) {
                    if (result.passed) summary[result.className].admitted++;
                    else summary[result.className].failed++;
                }
            }
            
            if (preview) {
                return res.json(summary);
            }
        
            const client = await req.db.connect();
            try {
                await client.query('BEGIN');
                for (const result of studentResults) {
                    if (result.passed) {
                        const targetClass = promotionMap[result.className];
                        // Only update if there is a target class (not for graduates)
                        if (targetClass) {
                             await client.query('UPDATE students SET classe_ref = $1 WHERE id = $2 AND instance_id = $3', [targetClass, result.student_id, req.user.instance_id]);
                        }
                    }
                }
                await client.query('COMMIT');
                await logActivity(req, 'PROMOTION_EXECUTED', null, null, `Promotion des élèves exécutée depuis l'année scolaire ID ${sourceYearId}.`);
                res.json({ message: "Promotion exécutée avec succès.", summary });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        }));

        // --- REPORT CARD ROUTES ---
        const canManageAppreciations = asyncHandler(async (req, res, next) => {
            if (req.user.role === 'admin' || (req.user.permissions && req.user.permissions.includes('appreciation:create'))) {
                return next();
            }
            if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Accès non autorisé.' });

            const { enrollment_id, subject_id } = req.body;
            if (!enrollment_id) return res.status(400).json({ message: 'ID d\'inscription manquant.' });
            
            const { rows: teacherRows } = await req.db.query('SELECT id FROM teachers WHERE user_id = $1', [req.user.id]);
            const teacher = teacherRows[0];
            if (!teacher) return res.status(403).json({ message: 'Profil professeur non trouvé.' });
            
            const { rows: enrollmentRows } = await req.db.query('SELECT "className", year_id FROM enrollments WHERE id = $1', [enrollment_id]);
            const enrollment = enrollmentRows[0];
            if (!enrollment) return res.status(404).json({ message: 'Inscription non trouvée.' });
            
            let hasAssignment = false;
            if (subject_id) { // This is for /api/appreciations
                const { rows: assignmentRows } = await req.db.query('SELECT id FROM teacher_assignments WHERE teacher_id = $1 AND class_name = $2 AND subject_id = $3 AND year_id = $4', [teacher.id, enrollment.className, subject_id, enrollment.year_id]);
                if (assignmentRows.length > 0) hasAssignment = true;
            } else { // This is for /api/general-appreciations
                const { rows: assignmentRows } = await req.db.query('SELECT id FROM teacher_assignments WHERE teacher_id = $1 AND class_name = $2 AND year_id = $3 LIMIT 1', [teacher.id, enrollment.className, enrollment.year_id]);
                if (assignmentRows.length > 0) hasAssignment = true;
            }

            if (hasAssignment) return next();

            return res.status(403).json({ message: 'Accès refusé. Vous n\'êtes pas assigné à cette classe.' });
        });

        app.post('/api/appreciations', authenticateToken, canManageAppreciations, asyncHandler(async (req, res) => {
            const { enrollment_id, subject_id, period_id, text } = req.body;
            // Security check
            const { rows } = await req.db.query('SELECT s.instance_id FROM enrollments e JOIN students s ON e.student_id = s.id WHERE e.id = $1', [enrollment_id]);
            if (rows.length === 0 || rows[0].instance_id !== req.user.instance_id) return res.status(403).json({ message: 'Accès refusé.' });

            const query = `
                INSERT INTO appreciations (enrollment_id, subject_id, period_id, text) VALUES ($1, $2, $3, $4)
                ON CONFLICT(enrollment_id, subject_id, period_id) DO UPDATE SET text = EXCLUDED.text`;
            await req.db.query(query, [enrollment_id, subject_id, period_id, text]);
            res.status(200).json({ message: 'Appréciation enregistrée.' });
        }));

        app.post('/api/general-appreciations', authenticateToken, canManageAppreciations, asyncHandler(async (req, res) => {
            const { enrollment_id, period_id, text } = req.body;
             // Security check
            const { rows } = await req.db.query('SELECT s.instance_id FROM enrollments e JOIN students s ON e.student_id = s.id WHERE e.id = $1', [enrollment_id]);
            if (rows.length === 0 || rows[0].instance_id !== req.user.instance_id) return res.status(403).json({ message: 'Accès refusé.' });

            const query = `
                INSERT INTO general_appreciations (enrollment_id, period_id, text) VALUES ($1, $2, $3)
                ON CONFLICT(enrollment_id, period_id) DO UPDATE SET text = EXCLUDED.text`;
            await req.db.query(query, [enrollment_id, period_id, text]);
            res.status(200).json({ message: 'Appréciation générale enregistrée.' });
        }));

        app.get('/api/bulk-report-data', authenticateToken, requirePermission('report_card:generate'), asyncHandler(async (req, res) => {
            const { yearId, className, periodId } = req.query;
            if (!yearId || !className || !periodId) return res.status(400).json({ message: "Année, Classe et Période sont requises." });

            const [enrollmentsRes, allPeriodsForYearRes] = await Promise.all([
                req.db.query(`
                    SELECT e.id as enrollment_id, e.student_id, e.year_id, e."className", e.mppa, e.payments, s.*
                    FROM enrollments e
                    JOIN students s ON e.student_id = s.id
                    WHERE e.year_id = $1 AND e."className" = $2 AND s.status = 'active' AND s.instance_id = $3
                    ORDER BY s.nom, s.prenom
                `, [yearId, className, req.user.instance_id]),
                req.db.query('SELECT * FROM academic_periods WHERE year_id = $1 ORDER BY id', [yearId])
            ]);
            const enrollments = enrollmentsRes.rows;
            const allPeriodsForYear = allPeriodsForYearRes.rows;
            
            if (enrollments.length === 0) {
                return res.json({ enrollments: [], gradesByEnrollment: {}, subjects: [], appreciationsByEnrollment: {}, generalAppreciationsByEnrollment: {} });
            }
            
            const enrollmentIds = enrollments.map(e => e.enrollment_id);

            const [gradesRes, appRes, genAppRes, subjectsRes] = await Promise.all([
                req.db.query(`SELECT * FROM grades WHERE period_id = $1 AND enrollment_id = ANY($2::int[])`, [periodId, enrollmentIds]),
                req.db.query(`SELECT * FROM appreciations WHERE period_id = $1 AND enrollment_id = ANY($2::int[])`, [periodId, enrollmentIds]),
                req.db.query(`SELECT * FROM general_appreciations WHERE period_id = $1 AND enrollment_id = ANY($2::int[])`, [periodId, enrollmentIds]),
                req.db.query(`
                    SELECT s.id as subject_id, cs.id, cs.class_name, cs.year_id, s.name as subject_name, cs.max_grade
                    FROM class_subjects cs JOIN subjects s ON cs.subject_id = s.id
                    WHERE cs.year_id = $1 AND cs.class_name = $2 ORDER BY s.name`, [yearId, className])
            ]);
            const [gradesForPeriod, appreciationsForPeriod, generalAppreciationsForPeriod, subjects] = [gradesRes.rows, appRes.rows, genAppRes.rows, subjectsRes.rows];
            
            let finalEnrollments = enrollments.map(e => ({
                id: e.enrollment_id, student_id: e.student_id, year_id: e.year_id, className: e.className,
                mppa: e.mppa, payments: e.payments, student: e,
            }));
            
            const isLastPeriod = allPeriodsForYear.length > 0 && allPeriodsForYear[allPeriodsForYear.length - 1].id === Number(periodId);

            if (isLastPeriod && enrollmentIds.length > 0) {
                const { rows: schoolInfoRows } = await req.db.query('SELECT passing_grade FROM instances WHERE id = $1', [req.user.instance_id]);
                const passingGrade = schoolInfoRows[0]?.passing_grade || 60;

                const annualAverageQuery = `
                    WITH SubjectAverages AS (
                        SELECT
                            g.enrollment_id,
                            g.subject_id,
                            CASE
                                WHEN SUM(g.max_score) > 0 THEN (SUM(g.score) / SUM(g.max_score)) * 100
                                ELSE 0
                            END as subject_average_percent
                        FROM grades g
                        WHERE g.enrollment_id = ANY($1::int[])
                        GROUP BY g.enrollment_id, g.subject_id
                    ),
                    AnnualAverages AS (
                        SELECT
                            sa.enrollment_id,
                            AVG(sa.subject_average_percent) as annual_average
                        FROM SubjectAverages sa
                        GROUP BY sa.enrollment_id
                    )
                    SELECT
                        e.id as enrollment_id,
                        COALESCE(aa.annual_average, 0) as annual_average
                    FROM enrollments e
                    LEFT JOIN AnnualAverages aa ON e.id = aa.enrollment_id
                    WHERE e.id = ANY($1::int[]);
                `;
                const { rows: annualAverageData } = await req.db.query(annualAverageQuery, [enrollmentIds]);
                
                const averageMap = new Map(annualAverageData.map(d => [d.enrollment_id, d.annual_average]));
            
                finalEnrollments = finalEnrollments.map(enrollment => {
                    const annualAverage = averageMap.get(enrollment.id) || 0;
                    const passed = annualAverage >= passingGrade;
                    return {
                        ...enrollment,
                        annualAverage,
                        promotionStatus: passed ? 'ADMIS(E) EN CLASSE SUPÉRIEURE' : 'À REFAIRE'
                    };
                });
            }

            const gradesByEnrollment = gradesForPeriod.reduce((acc, grade) => {
                if (!acc[grade.enrollment_id]) acc[grade.enrollment_id] = [];
                acc[grade.enrollment_id].push(grade);
                return acc;
            }, {});

            const appreciationsByEnrollment = appreciationsForPeriod.reduce((acc, app) => {
                if (!acc[app.enrollment_id]) acc[app.enrollment_id] = {};
                acc[app.enrollment_id][app.subject_id] = app.text;
                return acc;
            }, {});

            const generalAppreciationsByEnrollment = generalAppreciationsForPeriod.reduce((acc, app) => {
                acc[app.enrollment_id] = app.text;
                return acc;
            }, {});

            res.json({ enrollments: finalEnrollments, gradesByEnrollment, subjects, appreciationsByEnrollment, generalAppreciationsByEnrollment });
        }));


        // --- BACKUP routes ---
        const createBackup = (req, res, type) => {
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 19).replace(/-/g, '').replace(/:/g, '').replace('T', '_');
            let filename;
            let logType;

            const pgDumpArgs = [ '-d', process.env.PGDATABASE, '-U', process.env.PGUSER, '-h', process.env.PGHOST || 'localhost', '-p', process.env.PGPORT || '5432' ];
            const pgdumpEnv = { ...process.env, PGPASSWORD: process.env.PGPASSWORD };

            switch(type) {
                case 'sql':
                    logType = 'BACKUP_SQL';
                    filename = `backup_db_${dateStr}.sql`;
                    res.setHeader('Content-Type', 'application/sql');
                    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
                    
                    const pgdumpSql = spawn('pg_dump', pgDumpArgs, { env: pgdumpEnv });
                    pgdumpSql.stdout.pipe(res);
                    pgdumpSql.stderr.on('data', (data) => console.error(`pg_dump stderr: ${data}`));
                    pgdumpSql.on('error', (err) => { console.error('Failed to start pg_dump.', err); if (!res.headersSent) res.status(500).send('pg_dump failed'); });
                    pgdumpSql.on('close', () => logActivity(req, logType, null, null, `Sauvegarde de type 'sql' téléchargée.`));
                    return;

                case 'files':
                    logType = 'BACKUP_FILES';
                    filename = `backup_files_${dateStr}.zip`;
                    break;
                case 'full':
                default:
                    logType = 'BACKUP_FULL';
                    filename = `backup_full_${dateStr}.zip`;
                    break;
            }

            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

            const archive = archiver('zip', { zlib: { level: 9 } });
            archive.on('error', err => { if (!res.headersSent) res.status(500).send({error: err.message}); });
            res.on('close', () => logActivity(req, logType, null, null, `Sauvegarde de type '${type}' téléchargée.`));
            archive.pipe(res);

            const uploadsDir = path.join(__dirname, 'uploads');
            if (type === 'files' || type === 'full') {
                if (fs.existsSync(uploadsDir)) {
                    archive.directory(uploadsDir, 'uploads');
                }
            }
            
            if (type === 'full') {
                const pgdumpFull = spawn('pg_dump', [...pgDumpArgs, '-Fc'], { env: pgdumpEnv });
                archive.append(pgdumpFull.stdout, { name: 'database.dump' });
                pgdumpFull.stderr.on('data', (data) => console.error(`pg_dump stderr: ${data}`));
                pgdumpFull.on('error', (err) => { console.error('Failed to start pg_dump.', err); archive.abort(); });
                pgdumpFull.on('close', code => {
                    if (code !== 0) { console.error(`pg_dump exited with code ${code}`); archive.abort(); return; }
                    archive.finalize();
                });
            } else {
                archive.finalize();
            }
        };

        app.post('/api/superadmin/backups/sql', authenticateToken, isAnySuperAdmin, (req, res) => createBackup(req, res, 'sql'));
        app.post('/api/superadmin/backups/files', authenticateToken, isAnySuperAdmin, (req, res) => createBackup(req, res, 'files'));
        app.post('/api/superadmin/backups/full', authenticateToken, isAnySuperAdmin, (req, res) => createBackup(req, res, 'full'));


        // --- NEW TIMETABLE ROUTES ---

        // Locations (Classrooms)
        app.get('/api/locations', authenticateToken, requirePermission('settings:manage_timetable'), asyncHandler(async (req, res) => {
            const { rows } = await req.db.query('SELECT * FROM locations WHERE instance_id = $1 ORDER BY name', [req.user.instance_id]);
            res.json(rows);
        }));

        app.post('/api/locations', authenticateToken, requirePermission('settings:manage_timetable'), asyncHandler(async (req, res) => {
            const { name, capacity } = req.body;
            const { rows } = await req.db.query(
                'INSERT INTO locations (name, capacity, instance_id) VALUES ($1, $2, $3) RETURNING *',
                [name, capacity || null, req.user.instance_id]
            );
            res.status(201).json(rows[0]);
        }));

        app.put('/api/locations/:id', authenticateToken, requirePermission('settings:manage_timetable'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { name } = req.body;
            if (!name || !name.trim()) {
                return res.status(400).json({ message: 'Le nom de la salle est requis.' });
            }
            const { rows } = await req.db.query('UPDATE locations SET name = $1 WHERE id = $2 AND instance_id = $3 RETURNING *', [name.trim(), id, req.user.instance_id]);
            if (rows.length === 0) {
                return res.status(404).json({ message: 'Salle non trouvée.' });
            }
            res.json(rows[0]);
        }));

        app.delete('/api/locations/:id', authenticateToken, requirePermission('settings:manage_timetable'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { rowCount } = await req.db.query('DELETE FROM locations WHERE id = $1 AND instance_id = $2', [id, req.user.instance_id]);
            if(rowCount === 0) return res.status(404).json({ message: 'Salle non trouvée.' });
            res.status(204).send();
        }));
        
        // Full teacher assignments for a year
        app.get('/api/full-assignments', authenticateToken, requirePermission('settings:manage_timetable'), asyncHandler(async (req, res) => {
            const { yearId } = req.query;
            const query = `
                SELECT ta.*, s.name as subject_name, t.prenom as teacher_prenom, t.nom as teacher_nom
                FROM teacher_assignments ta
                JOIN subjects s ON ta.subject_id = s.id
                JOIN teachers t ON ta.teacher_id = t.id
                WHERE ta.year_id = $1 AND t.instance_id = $2
                ORDER BY t.nom, t.prenom, ta.class_name, s.name
            `;
            const { rows } = await req.db.query(query, [yearId, req.user.instance_id]);
            res.json(rows);
        }));

        // Schedule Slots (Timetable)
        app.get('/api/timetable', authenticateToken, isStaff, asyncHandler(async (req, res) => {
            const { yearId } = req.query;
            const query = `
                SELECT
                    ss.*,
                    ta.class_name,
                    t.id as teacher_id, t.prenom as teacher_prenom, t.nom as teacher_nom,
                    s.id as subject_id, s.name as subject_name,
                    l.name as location_name
                FROM schedule_slots ss
                JOIN teacher_assignments ta ON ss.assignment_id = ta.id
                JOIN teachers t ON ta.teacher_id = t.id
                JOIN subjects s ON ta.subject_id = s.id
                LEFT JOIN locations l ON ss.location_id = l.id
                WHERE ta.year_id = $1 AND t.instance_id = $2
                ORDER BY ss.day_of_week, ss.start_time
            `;
            const { rows } = await req.db.query(query, [yearId, req.user.instance_id]);
            res.json(rows);
        }));
        
        app.get('/api/teacher/timetable', authenticateToken, isTeacher, asyncHandler(async (req, res) => {
            const { rows: teacherRows } = await req.db.query('SELECT id FROM teachers WHERE user_id = $1', [req.user.id]);
            const teacher = teacherRows[0];
            if (!teacher) return res.status(404).json({ message: 'Profil professeur non trouvé.' });

            const query = `
                SELECT
                    ss.*, ta.class_name,
                    t.id as teacher_id, t.prenom as teacher_prenom, t.nom as teacher_nom,
                    s.id as subject_id, s.name as subject_name,
                    l.name as location_name
                FROM schedule_slots ss
                JOIN teacher_assignments ta ON ss.assignment_id = ta.id
                JOIN teachers t ON ta.teacher_id = t.id
                JOIN subjects s ON ta.subject_id = s.id
                LEFT JOIN locations l ON ss.location_id = l.id
                WHERE ta.year_id = $1 AND ta.teacher_id = $2
                ORDER BY ss.day_of_week, ss.start_time
            `;
            const { rows } = await req.db.query(query, [req.query.yearId, teacher.id]);
            res.json(rows);
        }));

        app.post('/api/timetable', authenticateToken, requirePermission('settings:manage_timetable'), asyncHandler(async (req, res) => {
            const { assignment_id, day_of_week, start_time, end_time, location_id } = req.body;
            
            if (start_time >= end_time) {
                return res.status(400).json({ message: "L'heure de fin doit être après l'heure de début." });
            }

            // Conflict check
            const { rows: assignmentInfoRows } = await req.db.query(
                `SELECT t.id as teacher_id FROM teacher_assignments ta JOIN teachers t ON ta.teacher_id = t.id WHERE ta.id = $1 AND t.instance_id = $2`,
                [assignment_id, req.user.instance_id]
            );

            if (assignmentInfoRows.length === 0) return res.status(403).json({ message: "Assignation invalide ou non autorisée." });
            const teacher_id = assignmentInfoRows[0].teacher_id;
            
            const conflictCheckQuery = `
                SELECT ss.id
                FROM schedule_slots ss
                JOIN teacher_assignments ta ON ss.assignment_id = ta.id
                WHERE ss.day_of_week = $1 AND (ss.start_time, ss.end_time) OVERLAPS ($2::TIME, $3::TIME)
                  AND (ta.teacher_id = $4 ${location_id ? 'OR ss.location_id = $5' : ''})
            `;
            const params = location_id ? [day_of_week, start_time, end_time, teacher_id, location_id] : [day_of_week, start_time, end_time, teacher_id];
            
            const { rows: conflictRows } = await req.db.query(conflictCheckQuery, params);
            if (conflictRows.length > 0) {
                return res.status(409).json({ message: "Conflit d'horaire détecté pour le professeur ou la salle." });
            }

            const { rows } = await req.db.query(
                'INSERT INTO schedule_slots (assignment_id, day_of_week, start_time, end_time, location_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [assignment_id, day_of_week, start_time, end_time, location_id || null]
            );
            res.status(201).json(rows[0]);
        }));
        
        app.put('/api/timetable/:id', authenticateToken, requirePermission('settings:manage_timetable'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { assignment_id, start_time, end_time, location_id } = req.body;
            
            if (start_time >= end_time) {
                return res.status(400).json({ message: "L'heure de fin doit être strictement après l'heure de début." });
            }

            // Get existing slot's day of week
            const { rows: slotRows } = await req.db.query(
                `SELECT ss.day_of_week FROM schedule_slots ss JOIN teacher_assignments ta ON ss.assignment_id = ta.id JOIN teachers t ON ta.teacher_id = t.id WHERE ss.id = $1 AND t.instance_id = $2`,
                [id, req.user.instance_id]
            );
            if (slotRows.length === 0) return res.status(404).json({ message: 'Créneau non trouvé ou non autorisé.' });
            const day_of_week = slotRows[0].day_of_week;

            // Get teacher ID for the potentially new assignment
            const { rows: assignmentInfoRows } = await req.db.query(
                `SELECT t.id as teacher_id FROM teacher_assignments ta JOIN teachers t ON ta.teacher_id = t.id WHERE ta.id = $1 AND t.instance_id = $2`,
                [assignment_id, req.user.instance_id]
            );
            if (assignmentInfoRows.length === 0) return res.status(403).json({ message: 'Assignation invalide ou non autorisée.' });
            const teacher_id = assignmentInfoRows[0].teacher_id;
            
            // Conflict check
            const conflictCheckQuery = `
                SELECT ss.id
                FROM schedule_slots ss
                JOIN teacher_assignments ta ON ss.assignment_id = ta.id
                WHERE ss.id != $1
                  AND ss.day_of_week = $2
                  AND (ss.start_time, ss.end_time) OVERLAPS ($3::TIME, $4::TIME)
                  AND (ta.teacher_id = $5 ${location_id ? 'OR ss.location_id = $6' : ''})
            `;
            const params = location_id ? [id, day_of_week, start_time, end_time, teacher_id, location_id] : [id, day_of_week, start_time, end_time, teacher_id];
            
            const { rows: conflictRows } = await req.db.query(conflictCheckQuery, params);
            if (conflictRows.length > 0) {
                return res.status(409).json({ message: "Conflit d'horaire détecté pour le professeur ou la salle." });
            }

            const { rows } = await req.db.query(
                'UPDATE schedule_slots SET assignment_id = $1, start_time = $2, end_time = $3, location_id = $4 WHERE id = $5 RETURNING *',
                [assignment_id, start_time, end_time, location_id || null, id]
            );
            res.json(rows[0]);
        }));
        
        app.delete('/api/timetable/:id', authenticateToken, requirePermission('settings:manage_timetable'), asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { rowCount } = await req.db.query(
                `DELETE FROM schedule_slots ss USING teacher_assignments ta, teachers t WHERE ss.assignment_id = ta.id AND ta.teacher_id = t.id AND ss.id = $1 AND t.instance_id = $2`,
                [id, req.user.instance_id]
            );
            if(rowCount === 0) return res.status(404).json({ message: 'Créneau non trouvé ou non autorisé.' });
            res.status(204).send();
        }));

        // --- RESOURCE ROUTES ---

        app.get('/api/admin/resources', authenticateToken, requirePermission('settings:manage_academic'), asyncHandler(async (req, res) => {
            const { yearId } = req.query;
            if (!yearId) {
                return res.status(400).json({ message: "L'année scolaire est requise." });
            }

            const query = `
                SELECT
                    r.*,
                    ta.subject_id,
                    s.name as subject_name,
                    ta.class_name,
                    t.prenom as teacher_prenom,
                    t.nom as teacher_nom
                FROM resources r
                JOIN teacher_assignments ta ON r.assignment_id = ta.id
                JOIN subjects s ON ta.subject_id = s.id
                JOIN teachers t ON ta.teacher_id = t.id
                WHERE ta.year_id = $1 AND t.instance_id = $2
                ORDER BY ta.class_name, s.name, r.created_at DESC
            `;

            const { rows } = await req.db.query(query, [yearId, req.user.instance_id]);
            res.json(rows);
        }));

        app.get('/api/resources', authenticateToken, asyncHandler(async (req, res) => {
            const { assignmentId, yearId, studentId } = req.query;

            let query;
            let params = [];
            
            if (assignmentId) { // For staff
                query = `SELECT r.id, r.assignment_id, r.resource_type, r.title, r.url, r.file_name, r.mime_type, r.created_at FROM resources r JOIN teacher_assignments ta ON r.assignment_id = ta.id JOIN teachers t ON ta.teacher_id = t.id WHERE r.assignment_id = $1 AND t.instance_id = $2 ORDER BY r.created_at DESC`;
                params.push(assignmentId, req.user.instance_id);
            } else if (yearId && req.user.student_id) { // For students
                const { rows: enrollmentRows } = await req.db.query('SELECT "className" FROM enrollments WHERE student_id = $1 AND year_id = $2', [req.user.student_id, yearId]);
                if (enrollmentRows.length === 0) return res.json([]);
                const className = enrollmentRows[0].className;
                
                query = `
                    SELECT r.id, r.assignment_id, r.resource_type, r.title, r.url, r.file_name, r.mime_type, r.created_at, ta.subject_id, s.name as subject_name
                    FROM resources r
                    JOIN teacher_assignments ta ON r.assignment_id = ta.id
                    JOIN subjects s ON ta.subject_id = s.id
                    JOIN teachers t ON ta.teacher_id = t.id
                    WHERE ta.year_id = $1 AND ta.class_name = $2 AND t.instance_id = $3
                    ORDER BY s.name, r.created_at DESC
                `;
                params = [yearId, className, req.user.instance_id];
            } else {
                return res.status(400).json({ message: "Paramètres de requête invalides." });
            }

            const { rows } = await req.db.query(query, params);
            res.json(rows);
        }));

        app.get('/api/resources/:id', authenticateToken, asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { role, instance_id, student_id } = req.user;

            const resourceQuery = `
                SELECT r.*, ta.class_name, ta.year_id
                FROM resources r
                JOIN teacher_assignments ta ON r.assignment_id = ta.id
                JOIN teachers t ON ta.teacher_id = t.id
                WHERE r.id = $1 AND t.instance_id = $2
            `;
            const { rows } = await req.db.query(resourceQuery, [id, instance_id]);

            if (rows.length === 0) {
                return res.status(404).json({ message: 'Ressource non trouvée ou non autorisée.' });
            }

            const resource = rows[0];

            if (role === 'student') {
                const enrollmentQuery = 'SELECT 1 FROM enrollments WHERE student_id = $1 AND year_id = $2 AND "className" = $3';
                const { rowCount } = await req.db.query(enrollmentQuery, [student_id, resource.year_id, resource.class_name]);
                if (rowCount === 0) {
                    return res.status(403).json({ message: "Vous n'êtes pas inscrit(e) dans le cours de cette ressource." });
                }
            }
            
            res.json(resource);
        }));

        app.post('/api/resources', authenticateToken, isStaff, asyncHandler(async (req, res) => {
            const { assignment_id, resource_type, title, url, file_name, mime_type, file_content } = req.body;
            
            const { rows: assignmentCheck } = await req.db.query(`SELECT 1 FROM teacher_assignments ta JOIN teachers t ON ta.teacher_id = t.id WHERE ta.id = $1 AND t.instance_id = $2`, [assignment_id, req.user.instance_id]);
            if(assignmentCheck.length === 0) return res.status(403).json({ message: 'Assignation non autorisée.' });
            
            const { rows } = await req.db.query(
                'INSERT INTO resources (assignment_id, resource_type, title, url, file_name, mime_type, file_content) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                [assignment_id, resource_type, title, url, file_name, mime_type, file_content]
            );
            res.status(201).json(rows[0]);
        }));

        app.put('/api/resources/:id', authenticateToken, isStaff, asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { title, url } = req.body;
        
            const { rowCount } = await req.db.query(
                `UPDATE resources r SET title = $1, url = $2
                 FROM teacher_assignments ta, teachers t 
                 WHERE r.assignment_id = ta.id AND ta.teacher_id = t.id 
                 AND r.id = $3 AND t.instance_id = $4`,
                [title, url, id, req.user.instance_id]
            );
        
            if (rowCount === 0) {
                return res.status(404).json({ message: 'Ressource non trouvée ou non autorisée.' });
            }
            
            const { rows } = await req.db.query('SELECT * FROM resources WHERE id = $1', [id]);
            res.json(rows[0]);
        }));

        app.delete('/api/resources/:id', authenticateToken, isStaff, asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { rowCount } = await req.db.query(
                `DELETE FROM resources r USING teacher_assignments ta, teachers t WHERE r.assignment_id = ta.id AND ta.teacher_id = t.id AND r.id = $1 AND t.instance_id = $2`,
                [id, req.user.instance_id]
            );
            if(rowCount === 0) return res.status(404).json({ message: 'Ressource non trouvée ou non autorisée.' });
            res.status(204).send();
        }));

        // --- SUPPORT & MESSAGING ROUTES ---

        // --- For Super Admins ---
        app.get('/api/superadmin/settings', authenticateToken, isAnySuperAdmin, asyncHandler(async (req, res) => {
            const { rows } = await req.db.query("SELECT key, value FROM platform_settings WHERE key IN ('contact_email', 'contact_phone')");
            const settings = rows.reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});
            res.json({ contact_email: settings.contact_email || '', contact_phone: settings.contact_phone || '' });
        }));

        app.put('/api/superadmin/settings', authenticateToken, isAnySuperAdmin, asyncHandler(async (req, res) => {
            const { contact_email, contact_phone } = req.body;
            const client = await req.db.connect();
            try {
                await client.query('BEGIN');
                await client.query("INSERT INTO platform_settings (key, value) VALUES ('contact_email', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [contact_email]);
                await client.query("INSERT INTO platform_settings (key, value) VALUES ('contact_phone', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [contact_phone]);
                await client.query('COMMIT');
                res.json({ message: "Informations de contact mises à jour." });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        }));

        app.get('/api/superadmin/messages/summary', authenticateToken, isAnySuperAdmin, asyncHandler(async (req, res) => {
            const query = `
                SELECT i.id as instance_id, i.name as instance_name,
                       COUNT(m.id) FILTER (WHERE m.is_read_by_superadmin = false AND m.sender_role = 'admin') as unread_count
                FROM instances i LEFT JOIN messages m ON i.id = m.instance_id
                GROUP BY i.id, i.name ORDER BY i.name;
            `;
            const { rows } = await req.db.query(query);
            res.json(rows);
        }));

        app.get('/api/superadmin/messages/:instanceId', authenticateToken, isAnySuperAdmin, asyncHandler(async (req, res) => {
            const { instanceId } = req.params;
            const client = await req.db.connect();
            try {
                await client.query('BEGIN');
                const { rows } = await client.query('SELECT * FROM messages WHERE instance_id = $1 ORDER BY created_at ASC', [instanceId]);
                await client.query("UPDATE messages SET is_read_by_superadmin = true WHERE instance_id = $1 AND sender_role = 'admin'", [instanceId]);
                await client.query('COMMIT');
                res.json(rows);
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        }));

        app.post('/api/superadmin/messages/:instanceId', authenticateToken, isAnySuperAdmin, asyncHandler(async (req, res) => {
            const { instanceId } = req.params;
            const { content } = req.body;
            const { rows } = await req.db.query(`INSERT INTO messages (instance_id, sender_role, sender_id, content, is_read_by_superadmin) VALUES ($1, 'superadmin', $2, $3, true) RETURNING *`, [instanceId, req.user.id, content]);
            res.status(201).json(rows[0]);
        }));

        // --- For School Admins ---
        app.get('/api/contact-info', authenticateToken, isAdmin, asyncHandler(async (req, res) => {
            const { rows } = await req.db.query("SELECT key, value FROM platform_settings WHERE key IN ('contact_email', 'contact_phone')");
            const settings = rows.reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});
            res.json({ contact_email: settings.contact_email || '', contact_phone: settings.contact_phone || '' });
        }));

        app.get('/api/admin/messages', authenticateToken, isAdmin, asyncHandler(async (req, res) => {
            const { rows } = await req.db.query('SELECT * FROM messages WHERE instance_id = $1 ORDER BY created_at ASC', [req.user.instance_id]);
            res.json(rows);
        }));

        app.post('/api/admin/messages', authenticateToken, isAdmin, asyncHandler(async (req, res) => {
            const { content } = req.body;
            const { rows } = await req.db.query(`INSERT INTO messages (instance_id, sender_role, sender_id, content, is_read_by_superadmin) VALUES ($1, 'admin', $2, $3, false) RETURNING *`, [req.user.instance_id, req.user.id, content]);
            res.status(201).json(rows[0]);
        }));
        
        // --- NEW DELETION ENDPOINTS ---

        app.delete('/api/messages/:id', authenticateToken, asyncHandler(async (req, res) => {
            const { id } = req.params;
            const { id: userId, role: userRole, instance_id } = req.user;
        
            const { rows } = await req.db.query('SELECT * FROM messages WHERE id = $1', [id]);
            const message = rows[0];
        
            if (!message) {
                return res.status(404).json({ message: 'Message non trouvé.' });
            }
        
            const isSender = message.sender_id === userId && message.sender_role === userRole;
            const isPrincipalSuperAdmin = userRole === 'superadmin';
            
            let canDelete = false;

            if (isPrincipalSuperAdmin) {
                canDelete = true;
            } else if (userRole === 'admin' && isSender && message.instance_id === instance_id) {
                canDelete = true;
            }

            if (!canDelete) {
                 return res.status(403).json({ message: 'Action non autorisée.' });
            }
        
            await req.db.query('DELETE FROM messages WHERE id = $1', [id]);
            res.status(204).send();
        }));

        app.delete('/api/superadmin/messages/:instanceId/clear', authenticateToken, isPrincipalSuperAdmin, asyncHandler(async (req, res) => {
            const { instanceId } = req.params;
            await req.db.query('DELETE FROM messages WHERE instance_id = $1', [instanceId]);
            res.json({ message: 'Conversation effacée.' });
        }));


        // --- Serve React App ---
        // This should be after all API routes
        const frontendDistPath = path.join(__dirname, '..', 'dist');
        
        // Check if the build folder exists (it won't in local dev, but will in production)
        if (fs.existsSync(frontendDistPath)) {
            // Serve static files from the React app build folder
            app.use(express.static(frontendDistPath));
        
            // The "catchall" handler: for any request that doesn't
            // match one of the API routes above, send back React's index.html file.
            app.get('*', (req, res) => {
                res.sendFile(path.resolve(frontendDistPath, 'index.html'));
            });
        }


        app.listen(PORT, '0.0.0.0', () => {
            console.log(`✅ Serveur backend démarré sur le port ${PORT}`);
        });

    } catch (error) {
        console.error("❌ ERREUR CRITIQUE:", error);
        process.exit(1);
    }
}

startServer();