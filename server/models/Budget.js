const mongoose = require('mongoose');

// Lưu hạn mức chi tiêu của từng user (1 document / user)
const budgetSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    monthlyLimit: { type: Number, default: 0, min: 0 },  // Hạn mức tháng (VND)
    dailyLimit: { type: Number, default: 0, min: 0 }   // Hạn mức ngày (VND)
}, {
    timestamps: true
});

module.exports = mongoose.model('Budget', budgetSchema);
