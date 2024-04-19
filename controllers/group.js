const Group = require("../models/group");
const Message = require("../models/messsage");
const { getReceiverSocketId, io } = require("../socket/socket");
const asyncHandler = require("express-async-handler");


const AWS = require("aws-sdk");
require("dotenv").config();

process.env.AWS_SDK_JS_SUPPERSS_MAINTENANCE_MODE_MESSAGE = "1";

AWS.config.update({
  region: process.env.REGION,
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();
const bucketName = process.env.S3_BUCKET_NAME;



const createGroup = asyncHandler(async (req, res) => {
  const { nameGroup } = req.body;
  const { userId } = req.body;

  if (!nameGroup) {
    return res.status(400).json({
      success: false,
      mes: "Missing inputs",
    });
  }
  let group = await Group.findOne({ nameGroup });
  if (group) {
    throw new Error("Group has existed!");
  } else {
    // Tạo một nhóm mới
    group = new Group({
      nameGroup,
      participants: [userId],
      messages: [],
    });
    await group.save();
    // Lưu nhóm vào cơ sở dữ liệu
    return res.status(201).json({
      success: true,
      mes: "Group created successfully",
      data: group,
    });
  }
});


const getGroups = asyncHandler(async (req, res)=>{
    const response = await Group.find()
    return res.status(200).json({
        success: response ? true : false,
        groups: response
    })
})


const sendMessageGr = async (req, res) => {
    try {
      const { message } = req.body;
      const { id: groupId } = req.params;
      const senderId = req.user._id;
  
      // Tìm nhóm dựa trên ID của nhóm
      const group = await Group.findById(groupId);
  
      if (!group) {
        return res.status(404).json({ error: "Nhóm không tồn tại" });
      }
    //   console.log("group:", group);
      // Tạo một tin nhắn mới
      const newMessage = new Message({
        senderId,
        groupId,
        message,
      });
  
      // Lưu tin nhắn mới vào cơ sở dữ liệu
      await newMessage.save();
  

      // Thêm ID của tin nhắn vào mảng tin nhắn của nhóm
      group.messages.push(newMessage._id);
      await group.save();
  
      // Gửi tin nhắn mới qua socket đến tất cả các thành viên của nhóm
    //   io.to(groupId).emit("newMessage", newMessage);
  
    const participants = group.participants;
    
    participants.forEach(async (participantId) => {
        console.log("participantId: ", participantId);
        const receiverSocketId = getReceiverSocketId(participantId.toString()); // Chuyển đổi participantId sang chuỗi trước khi sử dụng
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }
    });

      res.status(201).json(newMessage);
    } catch (error) {
      console.log("Lỗi trong sendMessage của controller nhóm: ", error.message);
      res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
    }
  };

  const getMessageGr = async (req, res) => {
    try {
      const { id: groupId } = req.params;
      const senderId = req.user._id;
  
      const group = await Group.findById(groupId).populate("messages");
  
      if (!group) return res.status(404).json({ error: "Group not found" });
  
      // Kiểm tra xem người gửi có phải là thành viên của nhóm hay không
      if (!group.participants.includes(senderId)) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
  
      const messages = group.messages;
    //   console.log("messages", messages);
  
      res.status(200).json(messages);
    } catch (error) {
      console.log("Error in getMessageGr controller: ", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  const sendMessageImageGr = async (req, res) => {
    try {
      const { message } = req.body;
      const { id: groupId } = req.params;
      const senderId = req.user._id;
  
        console.log("groupId :", groupId);

      const ne = req.file;
      const image = req.file?.originalname.split(".");
      const fileType = image[image.length - 1];
      const filePath = `${Date.now().toString()}.${fileType}`;
  
      const paramsS3 = {
        Bucket: bucketName,
        Key: filePath,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };
  
      s3.upload(paramsS3, async (err, data) => {
        if (err) {
          console.log("error: ", err);
          return res.send("err");
        } else {
          const imageURL = data.Location;
  
          let group = await Group.findById(groupId);
          if (!group) {
            return res.status(404).json({ error: "Group not found" });
          }
  
          const newMessage = new Message({
            senderId,
            groupId,
            image: imageURL,
          });
  
          if (newMessage) {
            group.messages.push(newMessage._id);
          }
  
          await Promise.all([group.save(), newMessage.save()]);
  
          // Emit new message to all participants in the group
          group.participants.forEach(async (participantId) => {
            const receiverSocketId = getReceiverSocketId(participantId.toString());
            if (receiverSocketId) {
              io.to(receiverSocketId).emit("newMessage", newMessage);
            }
          });
  
          res.status(201).json(newMessage);
        }
      });
    } catch (error) {
      console.log("Error in sendMessageImage controller: ", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  const deleteMessageGr = async (req, res) => {
    try {
      const { id: messageid } = req.params; // Lấy id của tin nhắn cần xóa từ params
      const senderid = req.user._id;
  
    //   console.log(messageId);
    //   console.log(senderId);
      // Tìm nhóm mà tin nhắn thuộc về
      const group = await Group.findOne({
        participants: senderid, // Đảm bảo người gửi tin nhắn là một trong các thành viên của nhóm
        messages: messageid,  // Chỉ lấy nhóm có chứa messageId
      });
      console.log(group);
      if (!group) {
        return res.status(404).json({
          error: "Group not found or you are not authorized to delete this message",
        });
      }
  
      // Xóa tin nhắn từ mảng messages của nhóm
      group.messages.pull(messageId);
      await group.save();
  
      // Xóa tin nhắn từ cơ sở dữ liệu
      await Message.findByIdAndDelete(messageId);
  
      // Lấy danh sách người tham gia nhóm (participants)
      const participants = group.participants.map(participant => participant.toString());
  
      // Gửi sự kiện "messageDeleted" đến tất cả người tham gia nhóm, trừ người gửi tin nhắn
      participants.forEach(async (participantId) => {
        if (participantId !== senderId) {
          const receiverSocketId = getReceiverSocketId(participantId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit("messageDeleted", messageId);
          }
        }
      });
  
      res.status(200).json({ message: "Message deleted successfully" });
    } catch (error) {
      console.log("Error in deleteMessage controller: ", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  };
module.exports = {
    createGroup,
    getGroups,
    sendMessageGr,
    getMessageGr,
    sendMessageImageGr,
    deleteMessageGr

};
