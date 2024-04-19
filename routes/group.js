const router = require('express').Router();
const ctrls = require('../controllers/group');
const { verifyAccessToken } = require('../middlewares/verifyToken');
const upload = require('../services/AwsS3Service');

router.post('/create', ctrls.createGroup)
router.get('/', ctrls.getGroups)
router.post('/send/:id', verifyAccessToken, ctrls.sendMessageGr);
router.get('/:id', verifyAccessToken, ctrls.getMessageGr);
router.post('/sendImage/:id', verifyAccessToken, upload.single('image'), ctrls.sendMessageImageGr);
router.delete('/deleteMessage/:id', verifyAccessToken, ctrls.deleteMessageGr);


module.exports = router;
