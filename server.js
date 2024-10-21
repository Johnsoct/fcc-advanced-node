'use strict';
// Packages
require('dotenv').config({ path: './.env.development' });
const express = require('express');
const LocalStrategy = require('passport-local')
const { ObjectId } = require('mongodb')
const passport = require('passport')
const session = require('express-session')
// Helpers
const connection = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');

const app = express();

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
        resave: true,
        saveUninitialized: true,
        secret: process.env.SESSION_SECRET,
}))
passport.initialize()
passport.session()


connection(async (client) => {
        const db = await client.db('test').collection('users')

        passport.use(new LocalStrategy((username, password, done) => {
                db.findOne({ username }, (err, user) => {
                        console.log(`User ${username} attempted to log in.`)
                        if (err) return done(err)
                        if (!user) return done(null, false)
                        if (password !== user.password) return done(null, false)
                        return done(null, user)
                })
        }))

        passport.serializeUser((user, done) => {
                done(null, user._id)
        })
        passport.deserializeUser((uniqueKey, done) => {
                db.findOne(
                        { _id: new ObjectId(uniqueKey) },
                        (err, doc) => {
                                done(null, doc)
                        }
                )
        })

        app.route('/').get((req, res) => {
                res.render('index', {
                        message: 'Please login',
                        showLogin: true,
                        title: 'Connected to Database',
                })
        });

        app.post(
                '/login', 
                passport.authenticate('local', { failureRedirect: '/' }),
                (req, res, next) => {
                        res.redirect('/profile')
                }
        )

        app.get('/profile', (req, res) => {
                res.render(profile, {

                })
        })
}).catch((error) => {
                app.route('/').get((req, res) => {
                        res.render('index', {
                                title: error,
                                message: 'Unable to connect to database',
                        })
                })
        })

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
        console.log('Listening on port ' + PORT);
});
