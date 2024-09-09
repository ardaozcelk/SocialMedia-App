const express = require("express");
const router = express.Router();
const imageUpload = require("../helpers/image-upload");

const auth = require("../middleware/auth");
const csrf = require("../middleware/csrf");

const userController = require("../controllers/user");


router.get("/", auth, csrf, userController.home);

router.get("/profile", auth, userController.get_profile);



router.get("/add-post", auth, userController.get_add_post);
router.post("/add-post", auth, csrf, imageUpload.single("image"), userController.post_add_post);

router.get("/profile/edit", auth, csrf, userController.get_edit_profile);
router.post("/profile/edit", auth, csrf, imageUpload.single("image"), userController.post_edit_profile);

router.get("/profile/user-not-found", auth, userController.user_not_found);

router.get("/profile/:postId", auth, csrf, userController.get_post);

router.post("/index/:id", auth, csrf, userController.like_post); // like post 

router.get("/comment/:id", auth, csrf, userController.get_comment_page);
router.post("/comment/:id", auth, csrf, userController.post_comment_page);


router.get("/profile/user/:username", auth, csrf, userController.get_otherUser_profile);
router.post("/profile/user/:username", auth, csrf, userController.follow_unfollow);

router.get("/:username/activity", auth, userController.get_your_activity);

router.get("/:username/reset-password", auth, csrf, userController.get_reset_password);
router.post("/:username/reset-password", auth, csrf, userController.post_reset_password);

router.get("/delete/:postId", auth, userController.delete_comment);
router.get("/delete/:postId/:commentId", auth, userController.delete_comment_reply);
router.post("/delete/:postId/comment/:commentId/reply", auth, csrf, userController.post_reply_post);

router.get("/search", auth, csrf, userController.get_search_page);
router.post("/search", auth, csrf, userController.post_search_page);
router.post("/delete-history/:historyId", auth, csrf, userController.delete_user_searchHistory);
router.post("/delete/clear-all-history", auth, userController.delete_clearAll_searchHistroy);

router.get("/add-story", auth, csrf, userController.get_add_story);
router.post("/add-story", auth, csrf, imageUpload.single("media"), userController.post_add_story);

router.post("/view/:id", auth, csrf, userController.post_story_viewers);

router.get("/story/information/:storyId", auth, csrf, userController.get_story_information);

router.get("/:username/archive", auth, csrf, userController.get_user_story_archive);

router.get("/change-privacy/:postId", auth, csrf, userController.change_privacy_post);

router.get("/delete-post/:postId", auth, csrf, userController.delete_post);



module.exports = router;