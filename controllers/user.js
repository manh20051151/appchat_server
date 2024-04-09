const User = require('../models/user')
const asyncHandler = require('express-async-handler')
const {generateAccessToken, generateRefreshToken} = require("../middlewares/jwt")
const jwt =require('jsonwebtoken')
const sendMail = require('../ultils/sendMail')
const crypto = require('crypto')
const makeToken = require('uniqid')
const user = require('../models/user')

// const register = asyncHandler(async(req, res)=>{
//     const {name, username, password} = req.body
//     if(!name || !username || !password){
//         return res.status(400).json({
//             success: false,
//             mes: 'Missing inputs'
//         })
//     }

//     const user = await User.findOne({username})
//     if(user){
//         throw new Error('User has existed!')
//     }
//     else{
//         const newUser = await User.create(req.body)
//         return res.status(200).json({
//             success: newUser ? true : false,
//             nes: newUser ? 'register is successfully' : 'something went wrong'
//         })
//     }

// })

const register = asyncHandler(async(req, res) =>{
    const {name, username, password} = req.body
    if(!name || !username || !password){
        return res.status(400).json({
            success: false,
            mes: 'Missing inputs'
        })
    }
    const user = await User.findOne({username})
    if(user){
        throw new Error('User has existed!')
    }
    else{
        const token = makeToken()
        res.cookie('dataregister', {...req.body, token}, {httpOnly: true, maxAge: 15*60*1000})
        const html = `Click vào link để xác thực tài khoản.(Link này hết hạn sau 15 phút) <a href=${process.env.URL_SERVER}/api/user/finalregister/${token}>Click here</a>`
        await sendMail({
            username,
            html,
            subject: 'Xác thực tài khoản'
        })
        return res.json({
            success: true,
            mes: 'Please check your email to active account'
        })
    }

    
})

const finalRegister = asyncHandler(async(req, res)=>{
    const cookie = req.cookies
    const { token } = req.params
    if(!cookie || cookie?.dataregister?.token !== token){
        res.clearCookie('dataregister')
        return res.redirect(`${process.env.CLIENT_URL}/finalregister/failed`)
    }
    const newUser = await User.create({
        name: cookie?.dataregister?.name,
        username: cookie?.dataregister?.username,
        password: cookie?.dataregister?.password,
    })
    res.clearCookie('dataregister')
    if(newUser){
        return res.redirect(`${process.env.CLIENT_URL}/finalregister/sussess`)
    } else{
        return res.redirect(`${process.env.CLIENT_URL}/finalregister/failed`)
    }


    // return res.status(200).json({
    //     success: newUser ? true : false,
    //     nes: newUser ? 'register is successfully' : 'something went wrong'
    // })
    
})


// refreshToken => cấp mới accessToken
// accessToken => xác thực người dùng, phân quyền
const login = asyncHandler(async(req, res)=>{
    const {username, password} = req.body
    if(!username || !password){
        return res.status(400).json({
            success: false,
            mes: 'Missing inputs'
        })
    }

    const response = await User.findOne({username})
    if(response && await response.isCorrectPassword(password)){
       // tách pass và role ra khỏi response
        const{password, role, refreshToken ,...userData} = response.toObject()
       //Tạo accessToken
        const accessToken = generateAccessToken(response._id, role)
        // tạo refreshToken
        const newRefreshToken = generateRefreshToken(response._id)
        
        //Lưu refreshToken vào db
        await User.findByIdAndUpdate(response.id, {refreshToken: newRefreshToken}, {new: true})
        // lưu refreshToken vào cookie
        res.cookie('refreshToken', newRefreshToken, {httpOnly: true, maxAge: 7*24*60*60*1000})
        return res.status(200).json({
            success: true,
            accessToken,
            userData
        })
    } else{
        throw new Error('Invalid credentials!')
    }


})


const getCurrent = asyncHandler(async(req, res)=>{
    const {_id} = req.user

    const user = await User.findById({_id}).select('-refreshToken -password')
   
    return res.status(200).json({
        success: user ? true : false,
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

const logout = asyncHandler(async(req, res)=>{
    const cookie = req.cookies
    if(!cookie || !cookie.refreshToken){
        throw new Error('No refresh tooken in cookie')
    }
    //xóa refresh token ở db
    await User.findOneAndUpdate({refreshToken: cookie.refreshToken}, {refreshToken: ''}, {new: true})
    // xóa refresh token ở cookie
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true
    })
    return res.status(200).json({
        success: true,
        mes: 'Logout is done'
    })
})

// client gửi email, server check email hợp lệ ko => gửi mail + link (password change token)
// Client check email => click link
// client gửi api kèm token
// check token có giống với token mà server gửi ở email ko
// change password

const forgotPassword = asyncHandler(async(req, res)=>{
    const {username} = req.body
    if(!username){
        throw new Error('Missing email')
    }
    const user = await User.findOne({username})
    if(!user){
        throw new Error('User not found')
    }
    const resetToken = user.createPasswordChangeToken()
    await user.save()

    const html = `Click vào link để đổi mật khẩu.(Link này hết hạn sau 15 phút) <a href = ${process.env.CLIENT_URL}/reset-password/${resetToken}>Click here</a>`
    const data = {
        username,
        html,
        subject: 'Forgot password'
    }
    const rs = await sendMail(data)
    return res.status(200).json({
        success: rs.response?.includes('OK') ? true : false,
        mes: rs.response?.includes('OK') ? 'Hãy check mail của bạn': 'Lỗi mail'
    })
})

const resetPassword = asyncHandler(async (req, res)=>{
    const {password, token} = req.body
    if(!password || !token){
        throw new Error('missing inputs')
    }

    const passwordResetWToken = crypto.createHash('sha256').update(token).digest('hex')
    const user = await User.findOne({passwordResetWToken, passwordResetExpires: {$gt: Date.now()}})
    if(!user){
        throw new Error('Invalid reset token')
    }
    user.password = password
    user.passwordResetWToken = undefined
    user.passwordChangedAt = Date.now()
    user.passwordResetExpires = undefined
    await user.save()
    return res.status(200).json({
        success: user ? true :false,
        mes: user ? 'update password': 'something went wrong'
    })
})

const getUsers = asyncHandler(async (req, res)=>{
    const response = await User.find().select('-refreshToken -password')
    return res.status(200).json({
        success: response ? true : false,
        users: response
    })
})

const deleteUser = asyncHandler(async (req, res)=>{
    const { _id} = req.query
    if(!_id){
        throw new Error('missing inputs')
    }
    const response = await User.findByIdAndDelete(_id)

    return res.status(200).json({
        success: response ? true : false,
        deletedUer: response ? `User with email ${response.username} deleted` : 'no user delete'
    })
})

const updateUser = asyncHandler(async (req, res)=>{
    const { _id} = req.user
    if(!_id || Object.keys(req.body).length === 0){
        throw new Error('missing inputs')
    }
    const response = await User.findByIdAndUpdate(_id, req.body, {new: true}).select('-password')

    return res.status(200).json({
        success: response ? true : false,
        updatedUer: response ? response : 'some thing went wrong'
    })
})

const updateUserByAdmin = asyncHandler(async (req, res)=>{
    const { uid} = req.params
    if(Object.keys(req.body).length === 0){
        throw new Error('missing inputs')
    }
    const response = await User.findByIdAndUpdate(uid, req.body, {new: true}).select('-password')

    return res.status(200).json({
        success: response ? true : false,
        updatedUer: response ? response : 'some thing went wrong'
    })
})

module.exports = {
    register, 
    login, 
    getCurrent,
    refreshAccessToken,
    logout,
    forgotPassword,
    resetPassword,
    finalRegister,
    getUsers,
    deleteUser,
    updateUser,
    updateUserByAdmin,
}