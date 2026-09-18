const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'rocktickets',

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    decimalNumbers: true,
});

async function testConnection() {
    try {
        const connection = await pool.getConnection();

        console.log('✅ MySQL conectado correctamente');

        connection.release();
    } catch (error) {
        console.error('❌ Error conectando MySQL:');
        console.error(error.message);

        process.exit(1);
    }
}

module.exports = {
    pool,
    testConnection,
};