const mongoose = require("mongoose");

const BorrowingSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
  member: { type: mongoose.Schema.Types.ObjectId, ref: "Member" },
  borrowDate: { type: Date, default: Date.now },
  returnDate: Date,
  returned: { type: Boolean, default: false },
});

module.exports = mongoose.model("Borrowing", BorrowingSchema);
