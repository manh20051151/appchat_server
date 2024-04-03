const userRouter = require('./user')
const {notFoud, errHandler} = require('../middlewares/errHandler')


const initRoutes = (app)=>{
    app.use('/api/user', userRouter)


    app.use(notFoud)
    app.use(errHandler)
}
module.exports = initRoutes