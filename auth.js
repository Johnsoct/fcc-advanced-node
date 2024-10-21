// Packages 
const bcrypt = require('bcrypt')
const GitHubStrategy = require('passport-github')
const LocalStrategy = require('passport-local')
const { ObjectId } = require('mongodb')
const passport = require('passport')

function authentication (db) {
        passport.use(new LocalStrategy((username, password, done) => {
                db.findOne({ username }, (err, user) => {
                        console.log(`User ${username} attempted to log in.`)
                        if (err) return done(err)
                        if (!user) return done(null, false)
                        if (!bcrypt.compareSync(password, user.password)) return done(null, false)
                        return done(null, user)
                })
        }))

        passport.use(new GitHubStrategy(
                {
                        clientID: process.env.GITHUB_CLIENT_ID,
                        clientSecret: process.env.GITHUB_CLIENT_SECRET,
                        callbackURL: 'http://localhost:8080/auth/github/callback',
                },
                function (accessToken, refreshToken, profile, cb) {
                        db.findOneAndUpdate(
                                { id: profile.id },
                                {
                                        $setOnInsert: {
                                                created_on: new Date(),
                                                email: Array.isArray(profile.emails)
                                                        ? profile.emails[0].value
                                                        : 'No public email',
                                                id: profile.id,
                                                photo: profile.photos[0].value || '',
                                                provider: profile.provider || '',
                                                name: profile.displayName || 'John Doe',
                                                username: profile.username,
                                        },
                                        $set: {
                                                last_login: new Date(),
                                        },
                                        $inc: {
                                                login_count: 1,
                                        },
                                },
                                {
                                        new: true,
                                        upsert: true,
                                },
                                (err, doc) => {
                                        return cb(null, doc.value)
                                }
                        )
                }
        ))

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
}

module.exports = authentication
