const userRouter = require('./user')
const messageRouter = require('./message')
const {notFoud, errHandler} = require('../middlewares/errHandler')

const initRoutes = (app)=>{
    app.use('/api/user', userRouter)
    app.use('/api/message', messageRouter)

    app.use(notFoud)
    app.use(errHandler)
}
module.exports = initRoutes 