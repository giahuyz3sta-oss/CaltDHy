const mongoose = require('mongoose');

const spendingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Ngày dạng "YYYY-MM-DD" – dùng để query và upsert
    date: {
        type: String,
        required: true,
        match: [/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày không hợp lệ (YYYY-MM-DD)']
    },
    year: { type: Number, required: true },
    month: { type: Number, required: true },  // 1-12
    day: { type: Number, required: true },

    // 4 danh mục chi tiêu (đơn vị: VND)
    food: { type: Number, default: 0, min: 0 },   // Ăn uống
    gas: { type: Number, default: 0, min: 0 },   // Xăng xe
    coffee: { type: Number, default: 0, min: 0 },   // Cà phê
    misc: { type: Number, default: 0, min: 0 },   // Linh tinh

    // Tổng ngày – tự tính trước khi save
    total: { type: Number, default: 0 }
}, {
    timestamps: true
});

// Tính total trước khi save
spendingSchema.pre('save', function (next) {
    this.total = (this.food || 0) + (this.gas || 0) + (this.coffee || 0) + (this.misc || 0);
    next();
});

// Index unique theo user + date để upsert nhanh
spendingSchema.index({ userId: 1, date: 1 }, { unique: true });
spendingSchema.index({ userId: 1, year: 1, month: 1 });

module.exports = mongoose.model('Spending', spendingSchema);
