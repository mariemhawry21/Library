const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  isbn: { type: String, unique: true, required: true },
  availableCopies: { type: Number, default: 1 },
  category: String,
});

module.exports = mongoose.model("Book", bookSchema);
