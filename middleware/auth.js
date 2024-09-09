const jwt = require("jsonwebtoken");
const { User } = require('../models/users'); // Kullanıcı modelinizi import edin

module.exports = async function (req, res, next) {
    const token = req.cookies['x-auth-token']; // Çerezden token al
    if (!token) {
        return res.status(401).redirect("/account/login");
    }

    try {
        const decodedToken = jwt.verify(token, "jwtPrivateKey");
        req.user = await User.findById(decodedToken._id).exec(); // Kullanıcıyı veritabanından yükle
        next();
    } catch (error) {
        console.error("Token doğrulama hatası:", error);
        res.redirect("/account/login");
    }
}
