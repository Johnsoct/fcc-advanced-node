// Packages
const passport = require('passport')
// Helpers
const ensureAuthenticated = require('./routeGuard')

function routes (app, db) {
        app
                .route('/')
                .get((req, res) => {
                        res.render('index', {
                                message: 'Please login',
                                showLogin: true,
                                showRegistration: true,
                                showSocialAuth: true,
                                title: 'Connected to Database',
                        })
                })

        // Pre-authenticated routes

        app
                .route('/auth/github')
                .get(
                        passport.authenticate('github')
                )

        app
                .route('/auth/github/callback')
                .get(
                        passport.authenticate('github', { 
                                failureRedirect: '/', 
                        }),
                        (req, res) => {
                                req.session.user_id = req.user.id
                                res.redirect('/chat')
                        }
                )

        app
                .route('/login')
                .post(
                        passport.authenticate('local', {
                                failureRedirect: '/login', 
                                successRedirect: '/profile' 
                        })
                )

        app
                .route('/register')
                .post(
                        (req, res, next) => {
                                // Register the new user
                                const password = req.body.password
                                const username = bcrypt.hashSync(req.body.username, 12)

                                db.findOne({ username }, (err, user) => {
                                        if (err) next(err)
                                        else if (user) res.redirect('/')
                                        else {
                                                db.insertOne({ password, username }, (err, doc) => {
                                                        if (err) redirect('/')
                                                        // Insert document is held within .ops of the doc
                                                        // next() moves to passport.authenticate (2nd .post argument)
                                                        else next(null, doc.ops[0])
                                                })
                                        }
                                })


                        },
                        // Redirect to /profile
                        passport.authenticate('local', { failureRedirect: '/', successRedirect: '/profile' })
                )

        // Post-authenticated routes

        app
                .route('/logout')
                .get((req, res) => {
                        req.logout()
                        res.redirect('/')
                })

        app
                .route('/profile')
                .get(
                        ensureAuthenticated,
                        (req, res) => {
                                res.render('profile', {
                                        username: req.user.username,
                                }
                        )
                })

        app
                .route('/chat')
                .get(
                        ensureAuthenticated,
                        (req, res) => {
                                res.render('chat', {
                                        user: req.user,
                                })
                        }
                )

        app.use((req, res, next) => {
                res
                        .status(404)
                        .type('text')
                        .send('Not Found')
        })

        return app
}

module.exports = routes
