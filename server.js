const express = require('express')
require('dotenv').config()
const dbConnect = require('./config/dbconnect')
const initRoutes = require('./routes')
const cookieParser = require('cookie-parser')

const app = express()
app.use(cookieParser())
const port = process.env.PORT || 8888
app.use(express.json()) // express đọc hiểu được data mà client gửi lên là json
app.use(express.urlencoded({extended: true})) //arr, obj, ...
dbConnect()


initRoutes(app)


app.listen(port, ()=>{
    console.log("on port: "+ port)
})

