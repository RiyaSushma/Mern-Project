import { Router } from 'express';
import { loginUser, registerUser, logoutUser, refreshAccessToken, currentPasswordChange, currentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getWatchHistory, getUserChannelProfile } from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJwt } from '../middlewares/auth.middleware.js';

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }, {
            name: "coverImage",
            maxCount: 3
        }
    ]),
    registerUser
);

router.route("/login-user").post(loginUser);

// secured routes
router.route("/logout").post(verifyJwt, logoutUser);
router.route("/refresh-token").post(verifyJwt, refreshAccessToken);
router.route("/change-password").post(verifyJwt, currentPasswordChange);
router.route("/current-user").get(verifyJwt, currentUser);
router.route("/update-user").get(verifyJwt, updateAccountDetails);
router.route("/update-user-avatar").patch(
    upload.single("avatar")
    ,verifyJwt, 
    updateUserAvatar
);
router.route("/update-user-cover-image").patch(
    upload.single("coverImage"),
    verifyJwt,
    updateUserCoverImage
)

router.route("/watch-history").get(verifyJwt, getWatchHistory);
router.route("/user-details/:username").get(verifyJwt, getUserChannelProfile);

export default router;