const router = require('express').Router()
const ctrls = require('../controllers/user')
const {verifyAccessToken, isAdmin} = require('../middlewares/verifyToken')

router.post('/register', ctrls.register)
router.get('/finalregister/:token', ctrls.finalRegister)
router.post('/login', ctrls.login)
router.get('/current', verifyAccessToken, ctrls.getCurrent)
router.post('/refreshtoken', ctrls.refreshAccessToken)
router.get('/logout' ,ctrls.logout)
router.post('/forgotpassword' ,ctrls.forgotPassword)
router.put('/resetpassword' ,ctrls.resetPassword)
router.get('/' ,[verifyAccessToken, isAdmin] ,ctrls.getUsers)
router.get('/getUsers', verifyAccessToken ,ctrls.getUsers)
router.get('/getUser' ,ctrls.getUsers)
router.delete('/' ,[verifyAccessToken, isAdmin] ,ctrls.deleteUser)
router.put('/current' ,verifyAccessToken ,ctrls.updateUser)
router.put('/:uid' ,[verifyAccessToken, isAdmin] ,ctrls.updateUserByAdmin)


module.exports = router