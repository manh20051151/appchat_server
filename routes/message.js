const router = require('express').Router()
const ctrls = require('../controllers/message')
const {verifyAccessToken} = require('../middlewares/verifyToken')

router.post('/send/:id', verifyAccessToken ,ctrls.sendMessage)
router.get('/:id', verifyAccessToken ,ctrls.getMessage)



module.exports = router