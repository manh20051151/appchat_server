const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
	{

        nameGroup: {
            type: String,
            required: true,
            trim: true,
        },
		participants: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
		],
		messages: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Message",
				default: [],
			},
		],
	},
	{ timestamps: true }
);

const Group = mongoose.model("Group", groupSchema);

module.exports = Group;
