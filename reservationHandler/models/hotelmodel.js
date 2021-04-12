const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//Define a schema

const hotelSchema = new Schema({
  Name: String,
  Roomnummer: Number,
  Rented: Boolean   
});

const Hotel = mongoose.model("Hotel", hotelSchema, "hotelscollection");

Hotel.createIndexes();

module.exports = Hotel;
