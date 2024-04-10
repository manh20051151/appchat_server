const Conversation = require("../models/conversation")
const Message = require('../models/messsage')


const sendMessage = async (req, res) =>{
    try {
        const { message} = req.body
        const {id: reciverId} = req.params
        const senderId = req.user._id

        //kiếm một cuộc trò chuyện
        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, reciverId]}
        })
        //tọa cuộc trò chuyện nếu chưa có
        if(!conversation){
            conversation = await Conversation.create({
                participants: [senderId, reciverId],
            })
        }

        const newMessage = new Message({
            senderId,
            reciverId,
            message,
        })
        
        if(newMessage){
            conversation.messages.push(newMessage._id)
        }
        await Promise.all([conversation.save(), newMessage.save()])
        res.status(201).json(newMessage)
        
    } catch (error) {
        console.log('Error in sendMessage controller: ', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
}


const getMessage = async (req, res) =>{
    try {
        const { id: userToChatId} = req.params
        const senderId = req.user._id

        const conversation = await Conversation.findOne({
            participants: {$all: [senderId, userToChatId]},
        }).populate('messages')
        
        if(!conversation){
            return res.status(200).json([])
        }
        const message = conversation.messages
        res.status(200).json(message)
    } catch (error) {
        console.log('Error in getMessage controller: ', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    sendMessage,
    getMessage
}