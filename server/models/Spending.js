const mongoose = require('mongoose');

const spendingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'] },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    day: { type: Number, required: true },

    // 4 danh mục mặc định
    food: { type: Number, default: 0, min: 0 },
    gas: { type: Number, default: 0, min: 0 },
    coffee: { type: Number, default: 0, min: 0 },
    misc: { type: Number, default: 0, min: 0 },

    // --- MỤC DÀI HẠN MỚI THÊM VÀO ---
    longTerm: { type: Map, of: Number, default: {} },

    total: { type: Number, default: 0 }
}, { timestamps: true });

// Tính tổng bao gồm cả mục dài hạn trước khi save
spendingSchema.pre('save', function (next) {
    let ltTotal = 0;
    if (this.longTerm) {
        for (let val of this.longTerm.values()) { ltTotal += val || 0; }
    }
    this.total = (this.food || 0) + (this.gas || 0) + (this.coffee || 0) + (this.misc || 0) + ltTotal;
    next();
});

spendingSchema.index({ userId: 1, date: 1 }, { unique: true });
module.exports = mongoose.model('Spending', spendingSchema);