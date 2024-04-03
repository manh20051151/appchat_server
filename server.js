const express = require('express')
require('dotenv').config()


const app = express()
const port = process.env.PORT || 8888
app.use(express.json()) // express đọc hiểu được data mà client gửi lên là json
app.use(express.urlencoded({extended: true})) //arr, obj, ...

app.use('/', (req, res)=>{
    res.send('on')
})
app.listen(port, ()=>{
    console.log("on port: "+ port)
})

