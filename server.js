'use strict';
// Packages
require('dotenv').config({ path: './.env.development' });
const express = require('express');
const passport = require('passport')
const session = require('express-session')
// Helpers
const authentication = require('./auth')
const connection = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const {
        initConnectedIOConfig,
        initializePassportSocketIO,
        store,
} = require('./socket.js')
const routes = require('./routes')


const app = express();
const http = require('http').createServer(app)

fccTesting(app); //For FCC testing purposes

// Public assets
app.use('/public', express.static(process.cwd() + '/public'));

// Request body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Template engine
app.set('view engine', 'pug')
app.set('views', './views/pug')

// Authentication
app.use(session({
        cookie: {
                // Using HTTP not HTTPS
                secure: false,
        },
        name: 'express.sid',
        resave: true,
        saveUninitialized: true,
        secret: process.env.SESSION_SECRET,
        store,
}))
app.use(passport.initialize())
app.use(passport.session())

// Socket + Passport integration
initializePassportSocketIO(http)

connection(async (client) => {
        const db = await client.db('test').collection('users')

        initConnectedIOConfig()
        authentication(db)
        routes(app, db)

}).catch((error) => {
        app
                .route('/')
                .get((req, res) => {
                        res.render('index', {
                                title: error,
                                message: 'Unable to connect to database',
                        })
                })
})

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
        console.log('Listening on port ' + PORT);
});
