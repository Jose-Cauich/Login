const { log, error } = require('console');
const path = require('path');
const config = require(path.join(__dirname, '..', 'config', 'config'));
const mysql = require('promise-mysql');

const conecction = async () => {
    try {
        const createconnection = await mysql.createConnection({
            host: config.host,
            database: config.database,
            user: config.user,
            password: config.password,
        });
        return createconnection;
    } catch (err) {
        console.error('No podemos conectarnos a la base de datos:', err);
        throw err;
    }
};

module.exports = { conecction };