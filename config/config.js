const path = require('path');
const dotenv = require('dotenv').config({ path: path.join(__dirname, '..', 'env', '.env') });

module.exports = {

    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.PORT,
    key: process.env.KEY,
}
