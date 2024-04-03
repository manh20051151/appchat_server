const mongoose = require('mongoose');
const bcrypt = require('bcrypt')


const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        username: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: true,
        },
        avatar: {
            type: String,
            default: '',
        },
        dateOfBirth: {
            type: Date,
            default: new Date('2000-01-01'),
        },
        gender: {
            type: Boolean,
            default: false,
        },
        phoneBooks: {
            type: [{ name: String, phone: String }],
            default: [],
        },
        role: {
            type: String,
            default: 'user',
        },
        // accessToken: { type: String, require: true },
        refreshToken: { type: String},
        passwordChangedAt:{
            type: String,
        },
        passwordResetWToken:{
            type: String,
        },
        passwordResetExpires:{
            type: String,
        }
    },
    { timestamps: true },
);

userSchema.pre('save', async function(next){
    if(!this.isModified('password')){
        next()
    }
    const salt = bcrypt.genSaltSync(10)
    this.password = await bcrypt.hash(this.password, salt)
})
module.exports = mongoose.model('User', userSchema);


