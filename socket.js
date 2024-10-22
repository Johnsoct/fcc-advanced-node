// Packages
const cookieParser = require('cookie-parser')
const connectMongo = require('connect-mongo')
const passportSocketIo = require('passport.socketio')
const session = require('express-session')
const socketIO = require('socket.io')

// Create a mongo session and store to track who is connected to our web socket
const MongoStore = connectMongo(session)
const URI = process.env.MONGO_URI
const store = new MongoStore({ url: URI }) // This is a MemoryStore

let io = undefined

function initConnectedIOConfig () {
        if (io === undefined) {
                console.log('IO has not been set yet')
                return
        }

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
}

function initMiddleware (io) {
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
}

function initializePassportSocketIO (http) {
        io = socketIO(http)
        initMiddleware(io)
}

module.exports = {
        initConnectedIOConfig,
        initializePassportSocketIO,
        store,
}
