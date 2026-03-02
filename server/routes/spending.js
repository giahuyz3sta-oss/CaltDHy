const express = require('express');
const router = express.Router();
const Spending = require('../models/Spending');
const Budget = require('../models/Budget');
const { protect } = require('../middleware/authMiddleware');

// Tất cả routes đều yêu cầu đăng nhập
router.use(protect);

// =============================================
// GET /api/spending?year=2026&month=3
// Lấy tất cả records chi tiêu của user trong tháng
// =============================================
router.get('/', async (req, res) => {
    try {
        const { year, month } = req.query;

        if (!year || !month) {
            return res.status(400).json({ success: false, message: 'Thiếu tham số year hoặc month.' });
        }

        const records = await Spending.find({
            userId: req.user._id,
            year: parseInt(year),
            month: parseInt(month)
        }).sort({ day: 1 });

        res.json({ success: true, data: records });
    } catch (error) {
        console.error('GET /api/spending error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy dữ liệu chi tiêu.' });
    }
});

// =============================================
// PUT /api/spending/:date
// Upsert dữ liệu chi tiêu 1 ngày (date = "YYYY-MM-DD")
// Body: { food, gas, coffee, misc }
// =============================================
// =============================================
// PUT /api/spending/:date (PHIÊN BẢN ĐÃ FIX LỖI DÀI HẠN)
// =============================================
router.put('/:date', async (req, res) => {
    try {
        const { date } = req.params;

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ success: false, message: 'Định dạng ngày không hợp lệ (YYYY-MM-DD).' });
        }

        const [year, month, day] = date.split('-').map(Number);

        // NHẬN THÊM longTerm TỪ FRONTEND GỬI LÊN
        const { food = 0, gas = 0, coffee = 0, misc = 0, longTerm = {} } = req.body;

        // Tính tổng bao gồm cả các khoản dài hạn
        const ltTotal = Object.values(longTerm).reduce((a, b) => a + (Number(b) || 0), 0);
        const total = (food || 0) + (gas || 0) + (coffee || 0) + (misc || 0) + ltTotal;

        // Cập nhật vào Database
        const record = await Spending.findOneAndUpdate(
            { userId: req.user._id, date },
            {
                userId: req.user._id, date, year, month, day,
                food: food || 0,
                gas: gas || 0,
                coffee: coffee || 0,
                misc: misc || 0,
                longTerm: longTerm, // LƯU KÉT SẮT MỚI
                total
            },
            { upsert: true, new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: `Đã lưu chi tiêu ngày ${date}!`,
            data: record
        });
    } catch (error) {
        console.error('PUT /api/spending/:date error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lưu dữ liệu chi tiêu.' });
    }
});

// =============================================
// GET /api/spending/budget
// Lấy hạn mức chi tiêu của user
// =============================================
router.get('/budget', async (req, res) => {
    try {
        const budget = await Budget.findOne({ userId: req.user._id });

        res.json({
            success: true,
            data: budget ? {
                monthlyLimit: budget.monthlyLimit,
                dailyLimit: budget.dailyLimit
            } : {
                monthlyLimit: 0,
                dailyLimit: 0
            }
        });
    } catch (error) {
        console.error('GET /api/spending/budget error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy hạn mức chi tiêu.' });
    }
});

// =============================================
// PUT /api/spending/budget
// Lưu / cập nhật hạn mức chi tiêu
// Body: { monthlyLimit, dailyLimit }
// =============================================
router.put('/budget', async (req, res) => {
    try {
        const { monthlyLimit = 0, dailyLimit = 0 } = req.body;

        const budget = await Budget.findOneAndUpdate(
            { userId: req.user._id },
            { monthlyLimit: monthlyLimit || 0, dailyLimit: dailyLimit || 0 },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            message: 'Đã lưu hạn mức chi tiêu!',
            data: { monthlyLimit: budget.monthlyLimit, dailyLimit: budget.dailyLimit }
        });
    } catch (error) {
        console.error('PUT /api/spending/budget error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lưu hạn mức chi tiêu.' });
    }
});

module.exports = router;
