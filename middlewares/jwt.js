const jwt = require('jsonwebtoken')

const generateAccessToken = (uid, role) => jwt.sign({_id: uid, role}, process.env.JWT_SECRET, {expiresIn: '15s'})
const generateRefreshToken = (uid) => jwt.sign({_id: uid}, process.env.JWT_SECRET, {expiresIn: '60s'})

module.exports = {
    generateAccessToken,
    generateRefreshToken,
}