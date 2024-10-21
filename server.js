'use strict';
// Packages
require('dotenv').config({ path: './.env.development' });
const cookieParser = require('cookie-parser')
const express = require('express');
const connectMongo = require('connect-mongo')
const passport = require('passport')
const passportSocketIo = require('passport.socketio')
const session = require('express-session')
// Helpers
const authentication = require('./auth')
const connection = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const routes = require('./routes')


const app = express();
const http = require('http').createServer(app)
const io = require('socket.io')(http)

// Create a mongo session and store to track who is connected to our web socket
const MongoStore = connectMongo(session)
const URI = process.env.MONGO_URI
const store = new MongoStore({ url: URI }) // This is a MemoryStore
// Very similar to connecting initializing our Express session
io.use(
        // .authorize gets the session id from the cookie and validates it
        // appends .request.user to socket
        passportSocketIo.authorize({
                cookieParser,
                key: 'express.sid', // Needs to match Express session cookie key
                secret: process.env.SESSION_SECRET,
                store,
                success: (data, accept) => {
                        console.log('successful connection to socket.io')
                        accept(null, true)
                },
                fail: (data, message, error, accept) => {
                        if (error) throw new Error(message)
                        console.log('failed connection to socket.io:', message)
                        accept(null, false)
                },
        })
)

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

console.log(authentication)
connection(async (client) => {
        const db = await client.db('test').collection('users')

        let currentUsers = 0
        io.on('connection', (socket) => {
                const username = socket.request.user.username

                console.log(`user ${username} + connected`)
                currentUsers++
                io.emit('user', {
                        connected: true,
                        currentUsers,
                        username,
                })

                socket.on('disconnect', (reason) => {
                        console.log('socket disconnected: ', reason)
                        currentUsers--
                        io.emit('user', {
                                connected: false,
                                currentUsers,
                                username,
                        })
                })

                socket.on('chat message', (message) => {
                        io.emit('chat message', {
                                message,
                                username,
                        })
                })
        })

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
