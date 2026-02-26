const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');

// Helper: Tạo JWT token
const createToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

// Helper: Cấu hình Nodemailer với Gmail
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
        }
    });
};

// =============================================
// POST /api/auth/register – Đăng ký tài khoản
// =============================================
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Kiểm tra email đã tồn tại chưa
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email này đã được đăng ký. Vui lòng dùng email khác.'
            });
        }

        // Tạo user mới (password sẽ được hash tự động qua pre-save hook)
        const user = await User.create({ name, email, password });

        const token = createToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công!',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ success: false, message: messages.join('. ') });
        }
        res.status(500).json({ success: false, message: 'Lỗi server. Vui lòng thử lại.' });
    }
});

// =============================================
// POST /api/auth/login – Đăng nhập
// =============================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập email và mật khẩu.'
            });
        }

        // Lấy user kèm password (mặc định bị ẩn)
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng.'
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng.'
            });
        }

        const token = createToken(user._id);

        res.json({
            success: true,
            message: 'Đăng nhập thành công!',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server. Vui lòng thử lại.' });
    }
});

// =============================================
// POST /api/auth/forgot-password – Quên mật khẩu
// =============================================
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            // Không tiết lộ email có tồn tại hay không (bảo mật)
            return res.json({
                success: true,
                message: 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.'
            });
        }

        // Tạo reset token ngẫu nhiên
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpiry = Date.now() + 15 * 60 * 1000; // Hết hạn sau 15 phút
        await user.save({ validateBeforeSave: false });

        const resetUrl = `${process.env.CLIENT_URL}/reset-password.html?token=${resetToken}&email=${email}`;

        // Gửi email
        const transporter = createTransporter();
        const mailOptions = {
            from: `"projectcanhan" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: '🔑 Đặt lại mật khẩu – projectcanhan',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f0f2f5; padding: 20px; border-radius: 8px;">
          <div style="background: #1877F2; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📅 projectcanhan</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1c1e21;">Xin chào ${user.name},</h2>
            <p style="color: #606770; font-size: 15px;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
            <p style="color: #606770; font-size: 15px;">Nhấn vào nút bên dưới để đặt lại mật khẩu. Link này sẽ hết hạn sau <strong>15 phút</strong>.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #1877F2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                Đặt lại mật khẩu
              </a>
            </div>
            <p style="color: #606770; font-size: 13px;">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
            <hr style="border: none; border-top: 1px solid #e4e6eb; margin: 20px 0;">
            <p style="color: #8a8d91; font-size: 12px; text-align: center;">© 2024 projectcanhan.com</p>
          </div>
        </div>
      `
        };

        await transporter.sendMail(mailOptions);

        res.json({
            success: true,
            message: 'Đã gửi email hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.'
        });
    } catch (error) {
        console.error('Lỗi gửi email:', error);
        res.status(500).json({ success: false, message: 'Không thể gửi email. Vui lòng thử lại sau.' });
    }
});

// =============================================
// POST /api/auth/reset-password – Đặt lại mật khẩu
// =============================================
router.post('/reset-password', async (req, res) => {
    try {
        const { token, email, newPassword } = req.body;

        if (!token || !email || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Thông tin không đầy đủ.'
            });
        }

        // Hash token để so sánh với token đã lưu
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            email,
            resetPasswordToken: hashedToken,
            resetPasswordExpiry: { $gt: Date.now() } // Token còn hạn
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'
            });
        }

        // Cập nhật mật khẩu mới
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiry = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Mật khẩu đã được đặt lại thành công! Vui lòng đăng nhập lại.'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server. Vui lòng thử lại.' });
    }
});

module.exports = router;
