// Librerías y dependencias
const path = require('path');
const morgan = require('morgan');
const bcrypt = require('bcrypt');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { port, key } = require(path.join(__dirname, 'config', 'config'));
const { conecction } = require(path.join(__dirname, 'database', 'conexion'));
const ejs = require('ejs');

// Aplicación
const app = express();

// Middlewares
app.use(morgan('combined'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para manejo de caché
app.use(function (req, res, next) {
    if (!req.user)
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    next();
});

// Motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Inicialización de sesiones
app.use(session({
    key: 'Cookies',
    secret: key,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));


// Definición de rutas
app.get('/', (req, res) => {
    res.redirect('/Login');
});

app.get('/Login', (req, res) => {
    res.render('Login');
});

app.get('/SignUp', (req, res) => {
    res.render('SignUp');
});

app.get('/Start', (req, res) => {
    res.render('Start');
});

app.post('/Access', async (req, res) => {
    try {
        const conexion = await conecction();
        const { user, pass } = req.body;

        const usuario = await conexion.query('SELECT * FROM Usuarios WHERE ID = ?', [user]);

        if (usuario.length > 0) {
            const [contrasenia] = await conexion.query('SELECT Password FROM Permisos WHERE ID = ?', [usuario[0].ID]);

            if (contrasenia && contrasenia.Password) {
                const vI = await bcrypt.compare(pass, contrasenia.Password);

                if (vI) {
                    req.session.sess = true;
                    req.session.name = usuario[0].Nombre;

                    res.render('Login', {
                        alert: true,
                        alertTitle: "Todo bien",
                        position: 'center',
                        alertMessage: "Bienvenido",
                        alertIcon: 'success',
                        showConfirmButton: true,
                        time: 1500,
                        ruta: '/SessionActive'
                    });
                } else {
                    res.render('Login', {
                        alert: true,
                        alertTitle: "Error en la contraseña",
                        position: 'center',
                        alertMessage: "La contraseña es errónea",
                        alertIcon: 'error',
                        showConfirmButton: true,
                        time: 1500,
                        ruta: '/Login'
                    });
                }
            } else {
                res.render('Login', {
                    alert: true,
                    alertTitle: "Error",
                    position: 'center',
                    alertMessage: "Contraseña no encontrada en la base de datos",
                    alertIcon: 'warning',
                    showConfirmButton: true,
                    time: 1500,
                    ruta: '/Login'
                });
            }
        } else {
            res.render('Login', {
                alert: true,
                alertTitle: "Usuario no encontrado",
                position: 'center',
                alertMessage: "El Usuario no coincide con la búsqueda",
                alertIcon: 'warning',
                showConfirmButton: true,
                time: 1500,
                ruta: '/Login'
            });

            conexion.end();
        }
    } catch (error) {
        console.error('Error al conectar la base de datos:', error);
        res.render('Login', {
            alert: true,
            alertTitle: "Error",
            position: 'center',
            alertMessage: "Error al conectar la base de datos",
            alertIcon: 'warning',
            showConfirmButton: true,
            time: 1500,
            ruta: '/Login'
        });
    }
});

app.post('/Register', async (req, res) => {
    try {
        const { identifier, name, roles, email, phone, pass } = req.body;
        const conexion = await conecction();
        const password = await bcrypt.hash(pass, 8);

        await conexion.query('INSERT INTO Usuarios SET ?', {
            ID: identifier,
            Nombre: name,
            Cargo: roles,
            Correo: email,
            [`Teléfono`]: phone,
        });

        await conexion.query('INSERT INTO Permisos SET ?', {
            ID: identifier,
            Password: password
        });

        res.render('SignUp', {
            alert: true,
            alertTitle: "Todo está como debe",
            position: 'center',
            alertMessage: "Bienvenido",
            alertIcon: 'success',
            showConfirmButton: true,
            time: 1500,
            ruta: '/Login'
        });
    } catch (error) {
        console.log('error', error);
        res.render('SignUp', {
            alert: true,
            alertTitle: "Algo salió mal",
            position: 'center',
            alertMessage: "Algo salió mal con todo",
            alertIcon: 'warning',
            showConfirmButton: true,
            time: 1500,
            ruta: '/SignUp'
        });
    }
});

app.get('/SessionActive', (req, res) => {
    if (req.session.sess) {
        res.render('Start', {
            session: true,
            name: req.session.name,
        });
    } else {
        res.render('Start', {
            session: false,
            msg: 'Debe de iniciar sesión',
        });
    }
});

app.get('/SessionOff', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/SessionActive');
    });
});

// Puerto por el que recibe solicitudes
app.listen(port, () => {
    console.log('Atendiendo solicitudes en el puerto ' + port);
});
