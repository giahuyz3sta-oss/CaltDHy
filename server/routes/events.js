const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const { protect } = require('../middleware/authMiddleware');

// Tất cả routes đều yêu cầu đăng nhập
router.use(protect);

// =============================================
// GET /api/events?year=2024&month=2
// Lấy tất cả sự kiện của user trong tháng
// =============================================
router.get('/', async (req, res) => {
    try {
        const { year, month } = req.query;

        let filter = { userId: req.user._id };

        // Lọc theo tháng nếu có truyền year & month
        if (year && month) {
            const paddedMonth = String(month).padStart(2, '0');
            const prefix = `${year}-${paddedMonth}`;
            filter.date = { $regex: `^${prefix}` };
        }

        const events = await Event.find(filter).sort({ date: 1, startTime: 1 });

        res.json({ success: true, data: events });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu lịch trình.' });
    }
});

// =============================================
// POST /api/events – Tạo sự kiện mới
// =============================================
router.post('/', async (req, res) => {
    try {
        const { title, date, startTime, endTime, description, color } = req.body;

        const event = await Event.create({
            userId: req.user._id,
            title,
            date,
            startTime: startTime || '',
            endTime: endTime || '',
            description: description || '',
            color: color || '#1877F2'
        });

        res.status(201).json({
            success: true,
            message: 'Đã thêm lịch trình!',
            data: event
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ success: false, message: messages.join('. ') });
        }
        res.status(500).json({ success: false, message: 'Lỗi khi tạo lịch trình.' });
    }
});

// =============================================
// PUT /api/events/:id – Cập nhật sự kiện
// =============================================
router.put('/:id', async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, userId: req.user._id });

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lịch trình hoặc bạn không có quyền chỉnh sửa.'
            });
        }

        const { title, date, startTime, endTime, description, color } = req.body;

        event.title = title || event.title;
        event.date = date || event.date;
        event.startTime = startTime !== undefined ? startTime : event.startTime;
        event.endTime = endTime !== undefined ? endTime : event.endTime;
        event.description = description !== undefined ? description : event.description;
        event.color = color || event.color;

        await event.save();

        res.json({
            success: true,
            message: 'Đã cập nhật lịch trình!',
            data: event
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật lịch trình.' });
    }
});

// =============================================
// DELETE /api/events/:id – Xóa sự kiện
// =============================================
router.delete('/:id', async (req, res) => {
    try {
        const event = await Event.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy lịch trình hoặc bạn không có quyền xóa.'
            });
        }

        res.json({ success: true, message: 'Đã xóa lịch trình!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi xóa lịch trình.' });
    }
});

module.exports = router;
