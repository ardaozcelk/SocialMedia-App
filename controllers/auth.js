const express = require("express");
const { User, validateRegister } = require("../models/users");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const emailService = require("../helpers/send-mail");
const config = require("../config");
const Joi = require("joi");


// Register
exports.get_register = async function (req, res) {
    try {
        return res.render("auth/register", {
            csrfToken: req.csrfToken()
        });
    } catch (error) {
        console.log(error);
    }
};

exports.post_register = async function (req, res) {
    try {
        const { username, name, email, password } = req.body;
        const { error } = validateRegister({ username, name, email, password });
        if (error) {
            return res.status(400).render("auth/register", {
                message: error.details[0].message,
                csrfToken: req.csrfToken(),
            });
        }

        const usernameControl = await User.findOne({ username });
        if (usernameControl) {
            return res.status(400).render("auth/register", {
                message: "This username has already been taken.",
                csrfToken: req.csrfToken(),
            });
        }

        const emailControl = await User.findOne({ email });
        if (emailControl) {
            return res.status(400).render("auth/register", {
                message: "This email has already been taken.",
                csrfToken: req.csrfToken(),
            });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            name,
            email,
            password: hashedPassword
        });

        await newUser.save();

        return res.redirect("/account/login");
    } catch (error) {
        console.log(error);
    }
};

// Login
exports.get_login = async function (req, res) {
    try {
        res.render("auth/login", {
            csrfToken: req.csrfToken()
        });
    } catch (error) {
        console.log(error);
    }
}

exports.post_login = async function (req, res) {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (!user) {
            return res.status(400).render("auth/login", {
                message: "User Not Found",
                csrfToken: req.csrfToken(),
            });
        }
        const match = await bcrypt.compare(req.body.password, user.password);
        if (!match) {
            return res.status(400).render("auth/login", {
                message: "Password is Wrong !",
                csrfToken: req.csrfToken(),
            });
        }
        const token = user.createAuthToken();
        res.cookie('x-auth-token', token, { httpOnly: true, secure: false, maxAge: 36000000 }); // 10 saat geçerlilik süresi
        res.redirect("/");

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).render("auth/login", {
            message: "An error occurred, please try again later.",
            csrfToken: req.csrfToken(),
        });
    }
}

// Logout
module.exports.get_logout = async function (req, res) {
    try {
        res.clearCookie("x-auth-token", {
            httpOnly: true,
            secure: false
        });
        res.redirect("/account/login")
    } catch (error) {
        console.log(error);
    }
}

// Forgot Password
exports.get_forgot_password = async function (req, res) {
    res.render("auth/forgot-password", {
        csrfToken: req.csrfToken()
    });
}

exports.post_forgot_password = async function (req, res) {

    try {
        let token = crypto.randomBytes(32).toString("hex");
        const user = await User.findOne({ username: req.body.username });
        if (!user) {
            return res.status(400).render("auth/forgot-password", {
                message: "User Not Found"
            });
        }

        if (user.email !== req.body.email) {
            return res.status(400).render("auth/forgot-password", {
                message: "User's email is wrong"
            });
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + (1000 * 60 * 60); // 1 saat
        await user.save();

        emailService.sendMail({
            from: config.email.from,
            to: req.body.email,
            subject: "Reset Password",
            html: `
            <p> Parolanızı güncellemek için aşağıdaki linke tıklayınız. </p>
            <p>   <a href="http://127.0.0.1:3000/account/new-password/${token}">Parola Sıfırla </a>
            </p>
            `
        });
        return res.render("auth/forgot-password", {
            message: "Please check your email address to reset your password.",
            csrfToken: req.csrfToken()
        });

    } catch (error) {
        console.log(error);
    }

}

// New Password
exports.get_new_password = async function (req, res) {
    const token = req.params.token;
    try {
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiration: { $gt: Date.now() }
        });
        if (user) {
            return res.render("auth/new-password", {
                token: token,
                csrfToken: req.csrfToken(),

            });
        } else {
            return res.render("auth/new-password", {
                csrfToken: req.csrfToken(),
                message: "User Not Found."
            });
        }

    } catch (error) {
        console.log(error);
    }
}

exports.post_new_password = async function (req, res) {
    const token = req.body.token;
    const password = req.body.newPassword;
    const passwordAgain = req.body.newPasswordAgain;
    try {
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiration: { $gt: Date.now() }
        });

        const passwordSchema = Joi.string()
            .min(12)
            .max(100)
            .pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/)
            .required()
            .messages({
                'string.base': 'Password must be a string.',
                'string.empty': 'Password cannot be empty.',
                'string.min': 'Password must be at least 12 characters long.',
                'string.max': 'Password must be less than 100 characters long.',
                'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
                'any.required': 'Password is required.'
            });

        const { error } = passwordSchema.validate(password); // yeni bir validation yaz sadece password için
        if (error) {
            return res.status(400).render("auth/new-password", {
                message: error.details[0].message,
                csrfToken: req.csrfToken(),
                token: token
            });
        }
        if (password === passwordAgain) {
            user.password = await bcrypt.hash(password, 10);
            user.resetToken = null;
            user.resetTokenExpiration = null;
            await user.save();

            return res.render("auth/new-password", {
                csrfToken: req.csrfToken(),
                message: "Your password has been updated successfully",
                token: token
            });
        } else {
            return res.render("auth/new-password", {
                csrfToken: req.csrfToken(),
                message: "Entered password must be the same !",
                token: token
            });
        }


    } catch (error) {
        console.error('Password reset error:', error);
        return res.render("auth/new-password", {
            csrfToken: req.csrfToken(),
            message: "An error occurred while resetting the password.",
            token: token
        });
    }
}

