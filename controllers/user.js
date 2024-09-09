const Post = require("../models/post");
const { User } = require("../models/users");
const Story = require("../models/story");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const fs = require("fs");

const path = require("path");

function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Invalid Date';
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}



exports.home = async function (req, res) {
    try {
        const posts = await Post.find({ privacy: "public" }).populate("userId").sort({ createdAt: -1 });
        const stories = await Story.find().populate("userId").sort({ createdAt: -1 });

        // Veritabanından gelen postları formatla
        const formattedPosts = posts.map(post => ({
            ...post.toObject(),
            createdAt: formatDate(post.createdAt)
        }));

        res.render("users/home", {
            user: req.user,
            posts: formattedPosts,
            stories: stories
        });
    } catch (error) {
        console.log(error);
    }
}


exports.get_profile = async function (req, res) {

    const postForProfile = await Post.find({ userId: req.user._id, privacy: "public" }).sort({ createdAt: -1 });
    const user = await User.findById(req.user._id)
        .populate({ path: "followers", select: "username name profilePhoto" })
        .populate({ path: "following", select: "username name profilePhoto" });
    try {
        res.render("users/profile", {
            user: user,
            posts: postForProfile
        });
    } catch (error) {
        console.log(error);
    }
}

// Add Post
exports.get_add_post = async function (req, res) {
    try {
        res.render("users/add-post", {
            user: req.user,
            csrfToken: req.csrfToken()
        });
    } catch (error) {
        console.log(error);
    }
}

exports.post_add_post = async function (req, res) {
    const { description, visibility, oldImage, location } = req.body;
    const userId = req.user._id;
    let image = "";

    try {
        if (req.file) {
            image = req.file.filename;

            // Eski dosyanın silinmesi (dosya mevcutsa)
            const oldImagePath = path.join(__dirname, '..', 'public', 'images', oldImage || '');
            if (oldImage && fs.existsSync(oldImagePath) && fs.statSync(oldImagePath).isFile()) {
                fs.unlink(oldImagePath, err => {
                    if (err) console.error('Eski dosya silinemedi:', err);
                });
            }
        }
        const newPost = new Post({
            userId: userId,
            image: image,
            content: description,
            location: location,
            privacy: visibility
        });

        await newPost.save();

        res.redirect("/");

    } catch (error) {
        console.log(error);
    }
}

// Edit Profile
exports.get_edit_profile = async function (req, res) {
    try {
        res.render("users/edit-profile", {
            user: req.user
        });
    } catch (error) {
        console.log(error);
    }
}

exports.post_edit_profile = async function (req, res) {
    const { name, username, email, biography } = req.body;
    let image = "";

    try {
        if (req.file) {
            image = req.file.filename;
            const user = await User.findById(req.user._id);

            if (user && user.profilePhoto) {
                const oldImagePath = path.join(__dirname, '..', 'public', 'images', user.profilePhoto);
                if (fs.existsSync(oldImagePath) && fs.statSync(oldImagePath).isFile()) {
                    fs.unlink(oldImagePath, err => {
                        if (err) console.error('Eski dosya silinemedi:', err);
                    });
                }
            }
        }
        else {
            const user = await User.findById(req.user._id);
            image = user.profilePhoto;
        }

        const usernameControl = await User.findOne({ username: username, _id: { $ne: req.user._id } }); // username'i sorgula ama bu sorguya kullanıcının kendisini dahil etme. Çünkü zaten aynı.
        if (usernameControl) {
            const message = { text: "This username has already been taken", class: "bg-red-500" };
            return res.status(400).render("users/edit-profile", {
                message: message,
                user: req.user,
                csrfToken: req.csrfToken()
            });
        }
        const emailControl = await User.findOne({ email: email, _id: { $ne: req.user._id } });
        if (emailControl) {
            const message = { text: "This email has already been taken", class: "bg-red-500" };
            return res.status(400).render("users/edit-profile", {
                message: message,
                user: req.user,
                csrfToken: req.csrfToken()
            });
        }

        const user = await User.findById(req.user._id);

        if (user) {
            user.name = name,
                user.username = username,
                user.profilePhoto = image,
                user.biography = biography
        }
        await user.save();

        res.redirect("/profile");

    } catch (error) {
        console.log(error);
    }
}

//Posts
exports.get_post = async function (req, res) {
    const postId = req.params.postId;
    try {
        const specialPost = await Post.findOne({ _id: postId }).populate("userId");

        const formattedPost = {
            ...specialPost.toObject(),
            createdAt: formatDate(specialPost.createdAt)
        };


        res.render("users/user-post", {
            user: req.user,
            post: formattedPost
        });
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
};


//Like
exports.like_post = async function (req, res) {
    const postId = req.params.id;
    const userId = req.user._id;

    try {
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const alreadyLiked = post.likes.includes(userId);

        if (alreadyLiked) {
            post.likes.pull(userId);
        } else {
            post.likes.push(userId);
        }

        await post.save();

        // Yanıtı JSON formatında gönder
        res.json({
            likeCount: post.likes.length,
            isLiked: !alreadyLiked
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

//Comment
exports.get_comment_page = async function (req, res) {
    const postId = req.params.id;
    const post = await Post.findById(postId)
        .populate("userId")
        .populate({
            path: 'comments.userId',
            select: 'username profilePhoto'
        }).populate({
            path: 'comments.replies.userId',
            select: 'username profilePhoto'
        });

    const formattedPost = {
        ...post.toObject(),
        createdAt: formatDate(post.createdAt),
        comments: post.comments
            .map(comment => ({
                ...comment.toObject(),
                createdAt: formatDate(comment.createdAt),
                replies: comment.replies
                    .map(reply => ({
                        ...reply.toObject(),
                        createdAt: formatDate(reply.createdAt)
                    }))
                    .reverse() // Yanıtları tersten sıralar
            }))
            .reverse() // Yorumları tersten sıralar
    };


    try {
        res.render("users/comment-page", {
            user: req.user,
            post: formattedPost
        });
    } catch (error) {
        console.log(error);
    }


}

exports.post_comment_page = async function (req, res) {
    const commentText = req.body.comment;
    const postId = req.params.id;

    try {
        const post = await Post.findById(postId).populate("userId");

        if (post) {

            const newComment = {
                userId: req.user._id,
                text: commentText,
                createdAt: new Date()
            };

            post.comments.push(newComment);

            await post.save();

            res.redirect(`/comment/${postId}`);
        } else {
            res.status(404).send("Post not found");
        }
    } catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).send("An error occurred while adding the comment");
    }
};

// Other Users Pages
exports.get_otherUser_profile = async function (req, res) {
    const username = req.params.username;
    try {
        const user = await User.findOne({ username: username })
            .populate({ path: "followers", select: "username name profilePhoto" })
            .populate({ path: "following", select: "username name profilePhoto" });
        const isFollowing = user.followers.some(follower => follower._id.toString() === req.user._id.toString());

        if (!user) {
            return res.redirect("/profile/user-not-found");
        }

        if (username === req.user.username) {
            return res.redirect("/profile");
        }

        const post = await Post.find({ userId: user._id }).sort({ createdAt: -1 });


        return res.render("users/other-user-profile", {
            user: user,
            posts: post,
            my: req.user,
            isFollowing,
            countFollower: user.followers.length,
        });

    } catch (error) {
        console.log(error);
    }

}

exports.follow_unfollow = async function (req, res) {
    const willFollowUsername = req.params.username;
    const userId = req.user._id;
    try {

        const user = await User.findOne({ username: willFollowUsername });

        if (!user) {
            return res.redirect("/profile/user-not-found");
        }

        const alreadyFollowed = user.followers.includes(userId);

        if (alreadyFollowed) {// Eğer zaten takip ediyorsak ve butona tıklandıysa unfollow işlemi olacak.
            user.followers.pull(userId);
            req.user.following.pull(user._id);
        } else {
            user.followers.push(userId);
            req.user.following.push(user._id);
        }

        await user.save();
        await req.user.save();

        res.json({
            isFollowing: !alreadyFollowed,
            countFollower: user.followers.length
        });

    } catch (error) {
        console.log(`FOLLOW OR UNFOLLOW ERROR : ${error}`);
        return res.status(500).send("Internal Server Error");
    }

}

exports.get_your_activity = async function (req, res) {
    const posts = await Post.find({ likes: req.user._id }).sort({ createdAt: -1 });
    try {
        res.render("users/user-activity", {
            user: req.user,
            posts: posts
        });
    } catch (error) {
        console.log(error);
    }

}

exports.get_reset_password = async function (req, res) {
    const usernameController = req.params.username;

    try {
        if (usernameController === req.user.username) {
            return res.render("users/reset-password", {
                csrfToken: req.csrfToken(),
                user: req.user
            });
        } else {
            return res.redirect("/profile/user-not-found");
        }

    } catch (error) {
        console.log(error);
    }

}

exports.post_reset_password = async function (req, res) {
    const usernameController = req.params.username;
    const oldPassword = req.body.password;
    const newPassword = req.body.newPassword;
    const newPasswordAgain = req.body.newPasswordAgain;
    try {
        const user = await User.findOne({ username: usernameController });

        if (!user) {
            return res.render("users/reset-password", {
                user: req.user,
                message: { text: "User not found!", class: "bg-red-400" }
            });
        }

        //bcrypt.compare fonksiyonunun ilk parametresi düz metin (plain text) parola, ikinci parametresi ise hashlenmiş parola olmalıdır.
        const isMatch = await bcrypt.compare(oldPassword, user.password);

        if (!isMatch) {
            return res.render("users/reset-password", {
                user: req.user,
                message: { text: "Old password did not matched !", class: "bg-red-400" }
            });
        }
        if (newPassword !== newPasswordAgain) {
            return res.render("users/reset-password", {
                user: req.user,
                message: { text: "The new passwords did not match !", class: "bg-red-400" }
            });
        }

        if (isMatch && (newPassword === newPasswordAgain)) {
            user.password = await bcrypt.hash(newPassword, 10);
            await user.save();

            return res.render("users/reset-password", {
                user: req.user,
                message: { text: "Your password changed successfully", class: "bg-green-400" }
            });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).send("An error occurred while resetting the password.");
    }


}

exports.delete_comment = async function (req, res) {
    const postId = req.params.postId;
    const commentId = req.query._commentId;

    try {
        const post = await Post.findByIdAndUpdate(
            postId,
            { $pull: { comments: { _id: commentId } } }, // $pull operatörü ile commenti çıkar
            { new: true } // Güncellenmiş postu geri döndür
        );
        if (!post) {
            return res.status(404).send('Post is not found !');
        }
        return res.redirect(`/comment/${postId}`);
    } catch (error) {
        console.log(error);
    }


}

exports.delete_comment_reply = async function (req, res) {
    const postId = req.params.postId;
    const commentId = req.params.commentId;
    const replyId = req.query._replyId;

    try {
        const post = await Post.findOneAndUpdate(
            { _id: postId, "comments._id": commentId },
            {
                $pull: {
                    "comments.$.replies": { _id: replyId }
                }
            },
            { new: true } // Güncellenmiş postu döndür
        );

        if (!post) {
            return res.status(404).send("Post veya yorum bulunamadı.");
        }

        return res.redirect(`/comment/${postId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send("Bir hata oluştu.");
    }

}

exports.post_reply_post = async function (req, res) {
    const postId = req.params.postId;
    const commentId = req.params.commentId;
    const replyText = req.body.reply;

    try {
        const post = await Post.findOneAndUpdate(
            { _id: postId, "comments._id": commentId },
            {
                $push: {
                    "comments.$.replies": {
                        text: replyText,
                        userId: req.user._id
                    }
                }
            },
            { new: true } // Güncellenmiş postu döndür
        );

        if (!post) {
            return res.status(404).send('Post veya yorum bulunamadı');
        }
        return res.redirect(`/comment/${postId}`);
    } catch (error) {
        console.log(error);
    }



}

//Search
exports.get_search_page = async function (req, res) {
    const user = await User.findById(req.user._id).populate("searchHistory");
    const reversedSearchHistory = user.searchHistory.reverse();

    return res.render("users/search", {
        csrfToken: req.csrfToken(),
        user: user,
        searchHistory: reversedSearchHistory
    });
}

exports.post_search_page = async function (req, res) {
    const searchQueryUsername = req.body.searchQuery;

    const user = await User.findOne({ username: searchQueryUsername });
    try {
        if (user) {

            if (!req.user.searchHistory.includes(user._id.toString())) {
                req.user.searchHistory.push(user._id);
                await req.user.save();
            }
            // Kullanıcı sayfasına git
            return res.redirect(`/profile/user/${user.username}`);
        } else {
            return res.redirect("/profile/user-not-found");
        }
    } catch (error) {
        console.log(error);
    }

}

exports.delete_user_searchHistory = async function (req, res) {
    const userId = req.params.historyId;
    try {
        const user = await User.findById(req.user._id);

        // Kullanıcı varsa ve searchHistory'de userId bulunuyorsa
        if (user && user.searchHistory.includes(userId)) {
            user.searchHistory.pull(userId); // userId'yi searchHistory'den çıkar
            await user.save();
            return res.redirect("/search");
        } else {
            return res.redirect("/profile/user-not-found");
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send("An error occurred while processing your request."); // Hata durumunda yanıt gönder
    }
};

exports.delete_clearAll_searchHistroy = async function (req, res) {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.searchHistory = []; // Diziyi sıfırla
            await user.save();
            return res.redirect('/search');
        } else {
            return res.redirect("/profile/user-not-found");
        }
    } catch (error) {
        console.log(error);
        res.status(500).send("An error occurred while clearing search history");
    }

}

exports.user_not_found = async function (req, res) {
    return res.render("users/user-not-found", {
        user: req.user
    });
}

exports.get_add_story = async function (req, res) {
    return res.render("users/add-story", {
        user: req.user
    });
}

exports.post_add_story = async function (req, res) {
    const userId = req.user._id;
    const oldMedia = req.body.oldMedia
    let media = "";
    try {
        if (req.file) {
            media = req.file.filename;

            const oldMediaPath = path.join(__dirname, '..', 'public', 'stories', oldMedia || '');
            if (oldMedia && fs.existsSync(oldMediaPath) && fs.statSync(oldMediaPath).isFile()) {
                fs.unlink(oldMediaPath, err => {
                    if (err) console.error('Eski medya dosyası silinemedi:', err);
                });
            }

        }
        const newStory = new Story({ userId: userId, media: media });
        await newStory.save();
        res.redirect("/");
    } catch (error) {
        console.log(error);
    }
}

//add viewers for story
exports.post_story_viewers = async function (req, res) {
    try {
        const story = await Story.findById(req.params.id);

        // Eğer kullanıcı zaten görüntüleyenler arasında yoksa ekle
        if (!story.viewers.includes(req.user._id)) {
            story.viewers.push(req.user._id);
            await story.save();
        }

        res.status(200).json({ success: true, viewers: story.viewers.length });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    }

}

exports.get_story_information = async function (req, res) {
    const storyId = req.params.storyId;

    try {
        const story = await Story.findById(storyId).populate("userId").populate("viewers");
        return res.render("users/story-information", {
            user: req.user,
            story: story
        });
    } catch (error) {
        console.log(error);
    }

}

exports.get_user_story_archive = async function (req, res) {
    const username = req.params.username;
    const user = await User.findOne({ username: username });
    const story = await Story.find({ userId: user._id }).populate("userId");
    const post = await Post.find({ userId: user._id, privacy: "private" }).populate("userId");
    try {
        return res.render("users/user-archive", {
            user: req.user,
            userStories: story,
            userPosts: post
        });
    } catch (error) {
        console.log(error);
    }
}

exports.change_privacy_post = async function (req, res) {
    const postId = req.params.postId;
    try {
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).send("Post not found");
        }

        post.privacy = post.privacy === "public" ? "private" : "public";
        await post.save();

        return res.redirect(`/profile/${post._id}`);
    } catch (error) {
        console.log(error);
        return res.status(500).send("An error occurred while changing privacy setting");
    }
}

exports.delete_post = async function (req, res) {
    const postId = req.params.postId;
    try {
        const post = await Post.findByIdAndDelete(postId);

        if (!post) {
            return res.status(404).send("Post not found");
        }

        return res.redirect(`/profile`);
    } catch (error) {
        console.log(error);
        return res.status(500).send("An error occurred while deleting the post");
    }
}






