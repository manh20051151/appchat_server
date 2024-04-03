const User = require('../models/user')
const asyncHandler = require('express-async-handler')
const {generateAccessToken, generateRefreshToken} = require("../middlewares/jwt")
const jwt =require('jsonwebtoken')


const register = asyncHandler(async(req, res)=>{
    const {name, username, password} = req.body
    if(!name || !username || !password){
        return res.status(400).json({
            sucess: false,
            mes: 'Missing inputs'
        })
    }

    const user = await User.findOne({username})
    if(user){
        throw new Error('User has existed!')
    }
    else{
        const newUser = await User.create(req.body)
        return res.status(200).json({
            sucess: newUser ? true : false,
            nes: newUser ? 'register is successfully' : 'something went wrong'
        })
    }

})


// refreshToken => cấp mới accsessToken
// accsessToken => xác thực người dùng, phân quyền
const login = asyncHandler(async(req, res)=>{
    const {username, password} = req.body
    if(!username || !password){
        return res.status(400).json({
            sucess: false,
            mes: 'Missing inputs'
        })
    }

    const response = await User.findOne({username})
    if(response && await response.isCorrectPassword(password)){
       // tách pass và role ra khỏi response
        const{password, role, ...userData} = response.toObject()
       //Tạo accsessToken
        const accsessToken = generateAccessToken(response._id, role)
        // tọa refreshToken
        const refreshToken = generateRefreshToken(response._id)
        
        //Lưu refreshToken vào db
        await User.findByIdAndUpdate(response.id, {refreshToken}, {new: true})
        // lưu refreshToken vào cookie
        res.cookie('refreshToken', refreshToken, {httpOnly: true, maxAge: 7*24*60*60*1000})
        return res.status(200).json({
            sucess: true,
            accsessToken,
            userData
        })
    } else{
        throw new Error('Invalid credentials!')
    }


})


const getCurrent = asyncHandler(async(req, res)=>{
    const {_id} = req.user

    const user = await User.findById({_id}).select('-refreshToken -role -password')
   
    return res.status(200).json({
        success: true,
        rs: user ? user : 'User not found'
    })
})

const refreshAccessToken = asyncHandler(async(req, res)=>{
    //lấy token từ cookie
    const cookie =req.cookies
    // check có token ko
    if(!cookie && !cookie.refreshToken){
        throw new Error('No refresh token in cookies')
    }
    // check token có hợp lệ ko
    const rs = await jwt.verify(cookie.refreshToken ,process.env.JWT_SECRET)
    const response = await User.findOne({_id: rs._id, refreshToken: cookie.refreshToken})
    return res.status(200).json({
        success: response ? true : false,
        newAccessToken: response ? generateAccessToken(response._id, response.role) : 'Refresh token not matched'
    })


})




module.exports = {
    register, 
    login, 
    getCurrent,
    refreshAccessToken,
}