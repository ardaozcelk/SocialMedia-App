const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth");

const csrf = require("../middleware/csrf");

router.get("/login", csrf, authController.get_login);
router.post("/login", csrf, authController.post_login);

router.get("/register", csrf, authController.get_register);
router.post("/register", csrf, authController.post_register);

router.get("/logout", csrf, authController.get_logout);


router.get("/forgot-password", csrf, authController.get_forgot_password);
router.post("/forgot-password", csrf, authController.post_forgot_password);

router.get("/new-password/:token", csrf, authController.get_new_password);
router.post("/new-password", csrf, authController.post_new_password);


module.exports = router;