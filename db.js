const { Pool } = require('pg');

const pool = new Pool({
    user: 'school_user',
    host: 'localhost',
    database: 'schoolhelper',
    password: 'StrongPassword123!',
    port: 5432,
});

module.exports = pool;