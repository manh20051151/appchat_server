const Conversation = require("../models/conversation");
const Message = require("../models/messsage");
const { getReceiverSocketId, io } = require("../socket/socket");

const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const { id: reciverId } = req.params;
    const senderId = req.user._id;

    //kiếm một cuộc trò chuyện
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, reciverId] },
    });
    //tọa cuộc trò chuyện nếu chưa có
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, reciverId],
      });
    }

    const newMessage = new Message({
      senderId,
      reciverId,
      message,
    });

    if (newMessage) {
      conversation.messages.push(newMessage._id);
    }
    await Promise.all([conversation.save(), newMessage.save()]);

    //socket
    const receiverSocketId = getReceiverSocketId(reciverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getMessage = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const senderId = req.user._id;

    const conversation = await Conversation.findOne({
      participants: { $all: [senderId, userToChatId] },
    }).populate("messages"); // NOT REFERENCE BUT ACTUAL MESSAGES

    if (!conversation) return res.status(200).json([]);

    const messages = conversation.messages;

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params; // Lấy id của tin nhắn cần xóa từ params
    const senderId = req.user._id;
    console.log(senderId);
    // Tìm cuộc trò chuyện mà tin nhắn thuộc về
    const conversation = await Conversation.findOne({
      participants: { $in: [senderId] }, // Đảm bảo người gửi tin nhắn là một trong các người tham gia cuộc trò chuyện
      messages: messageId, // Chỉ lấy cuộc trò chuyện có chứa messageId
    });
    // console.log(conversation);
    if (!conversation) {
      return res.status(404).json({
        error:
          "Conversation not found or you are not authorized to delete this message",
      });
    }
    console.log(conversation);

    // Xóa tin nhắn từ mảng messages của cuộc trò chuyện
    conversation.messages.pull(messageId);
    await conversation.save();

    // Xóa tin nhắn từ cơ sở dữ liệu
    await Message.findByIdAndDelete(messageId);
    

    // Lấy reciverId từ participants trong conversation
    const reciverId = conversation.participants
    .find(participant => participant.toString() !== senderId)
    .toString(); // Add .toString() to convert to string
  console.log("tren ", reciverId);


    const receiverSocketId = getReceiverSocketId(reciverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", messageId);
      console.log("okok");
    }

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.log("Error in deleteMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  sendMessage,
  getMessage,
  deleteMessage,
};
