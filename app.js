//Librerias y dependencias
const path = require('path');
const morgan = require('morgan');
const bcrypt = require('bcrypt');
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { port, key } = require(path.join(__dirname, 'config', 'config'));
const { conecction } = require(path.join(__dirname, 'database', 'conexion'));
const ejs = require('ejs');

//Aplicacion
const app = express();

//Alerta
const alert = {
    alert: true,
    alertTitle: "Algo salio mal",
    position: "center",
    alertMessage: "Algo salió mal",
    alertIcon: 'warning',
    showConfirmButton: true,
    time: 1500,
    ruta: '/Login',
}

//Middlewares
app.use(morgan('combined'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


//Middleware para manejo de caché
app.use(function (req, res, next) {
    if (!req.user)
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    next();
});


//Motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


//Rutas
app.get('/Login', (req, res) => {
    res.render('Login');
});

app.get('/SignUp', (req, res) => {
    res.render('SignUp');
});

app.get('/Start', (req, res) => {
    res.render('Start');
})


//Funcion async que engloba a todos las rutas
const init = async () => {

    const conexion = await conecction();
    const sessionStore = new MySQLStore({}, conexion);

    app.use(session({
        key: 'Cookies',
        secret: key,
        sessionStore,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }
    }));

    //Solicitud de validacion
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

                        alert.alertTitle = "Todo bien";
                        alert.alertMessage = "Bienvenido";
                        alert.alertIcon = 'success';
                        alert.ruta = '/SessionActive';
                    } else {
                        // Contraseña incorrecta
                        alert.alertTitle = "Error en la contraseña";
                        alert.alertMessage = "La contraseña es errónea";
                        alert.alertIcon = 'error';
                        alert.ruta = '/Login';
                    }
                } else {
                    // Contraseña no encontrada
                    alert.alertTitle = "Error";
                    alert.alertMessage = "Contraseña no encontrada en la base de datos";

                    alert.ruta = '/Login';
                }
            } else {
                // Usuario no encontrado
                alert.alertTitle = "Usuario no encontrado";
                alert.alertMessage = "El Usuario no coincide con la búsqueda";
                alert.ruta = '/Login';
            }

            res.render('Login', alert);

            //Finalizamos la conexión
            conexion.end();

        } catch (error) {
            console.error('Error al conectar la base de datos:', error);
            alert.alertMessage = 'Error al conectar la base de datos';
            alert.ruta = '/Login';
            res.render('Login', alert);
        }
    });

    //Solicitud de registro
    app.post('/Register', async (req, res) => {

        try {
            const { identifier, name, roles, email, phone, pass } = req.body
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

            alert.alertTitle = "Todo está como debe";
            alert.alertMessage = "Bienvenido";
            alert.alertIcon = 'success';
            alert.ruta = '/Login';

        } catch (error) {
            console.log('error', error);

            alert.alertTitle = "Algo salio mal";
            alert.alertMessage = "Algo salió mal con todo";
            alert.alertIcon = 'warning';
            alert.ruta = '/SignUp';
        }
        res.render('SignUp', alert);
    });

    //Verificacion de sesión
    app.get('/SessionActive', (req, res) => {

        if (req.session.sess) {
            res.render('Start', {
                session: true,
                name: req.session.name,
            })
        }
        else {
            res.render('Start', {
                session: false,
                msg: ' debe de iniciar sesion',
            })
        }
        res.end();
    });

    //Destruccion de la sesión actual
    app.get('/SessionOff', (req, res) => {
        req.session.destroy(() => {
            res.redirect('/SessionActive');
        })
    });
};

//Llamada al metodo
init();

//Puerto por el que recibe solicitudes
app.listen(port, () => {
    console.log('Atendiendo solicitudes en el puerto ' + port);
});