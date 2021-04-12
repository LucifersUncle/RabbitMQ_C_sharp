const mongoose = require("mongoose");
const Schema = mongoose.Schema;
//Define a schema

const roomSchema = new Schema({
  RoomNumber: Number,
  Beds: Number,
  Reserved: Boolean,
});

const room = mongoose.model("Room", roomSchema, "roomscollection");

room.createIndexes();

module.exports = roomSchema;
