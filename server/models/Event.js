const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Vui lòng nhập tên công việc'],
        trim: true,
        maxlength: [100, 'Tên công việc không được quá 100 ký tự']
    },
    date: {
        type: String, // Lưu dạng "YYYY-MM-DD" để dễ query theo ngày
        required: [true, 'Vui lòng chọn ngày']
    },
    startTime: {
        type: String, // Định dạng "HH:MM"
        default: ''
    },
    endTime: {
        type: String, // Định dạng "HH:MM"
        default: ''
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Mô tả không được quá 500 ký tự'],
        default: ''
    },
    color: {
        type: String,
        default: '#1877F2' // Màu xanh Facebook mặc định
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index để query nhanh theo user và tháng
eventSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('Event', eventSchema);
