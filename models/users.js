const { mongoose, Schema, Types } = require("mongoose");
const Joi = require("joi");
const jwt = require("jsonwebtoken");

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    profilePhoto: {
        type: String
    },
    biography: {
        type: String
    },
    followers: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }]
    ,
    following: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    resetToken: {
        type: String,
        required: false
    },
    resetTokenExpiration: {
        type: Date,
        required: false
    },
    searchHistory: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }]
}, { timestamps: true });

function validateRegister(user) {
    const schema = new Joi.object({
        username: Joi.string()
            .min(3)
            .max(30)
            .required()
            .messages({
                'string.base': 'Username must be a string.',
                'string.empty': 'Username cannot be empty.',
                'string.min': 'Username must be at least 3 characters long.',
                'string.max': 'Username must be less than 30 characters long.',
                'any.required': 'Username is required.'
            }),
        name: Joi.string()
            .min(3)
            .max(30)
            .required()
            .messages({
                'string.base': 'Username must be a string.',
                'string.empty': 'Username cannot be empty.',
                'string.min': 'Username must be at least 3 characters long.',
                'string.max': 'Username must be less than 30 characters long.',
                'any.required': 'Username is required.'
            }),
        email: Joi.string()
            .email({ tlds: { allow: false } })
            .required()
            .messages({
                'string.base': 'Email must be a string.',
                'string.empty': 'Email cannot be empty.',
                'string.email': 'Email must be a valid email address.',
                'any.required': 'Email is required.'
            }),
        password: Joi.string()
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
            })
    });
    return schema.validate(user);
}

userSchema.methods.createAuthToken = function () {
    return jwt.sign({
        _id: this._id,
    }, "jwtPrivateKey", { expiresIn: '10h' });
}

const User = mongoose.model("User", userSchema);

module.exports = { User, validateRegister };