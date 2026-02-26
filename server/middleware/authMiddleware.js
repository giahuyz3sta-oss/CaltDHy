const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    // Lấy token từ header Authorization: Bearer <token>
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.'
        });
    }

    try {
        // Giải mã token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Đính kèm thông tin user vào request
        req.user = await User.findById(decoded.id);

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Tài khoản không tồn tại.'
            });
        }

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'
        });
    }
};

module.exports = { protect };
