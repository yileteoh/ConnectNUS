const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');

router.post('/forums', forumController.createPost);
router.get('/forums', forumController.getPosts);
router.put('/forums/:postId/toggle-like', forumController.toggleLike);
router.put('/forums/:postId/toggle-bookmark', forumController.toggleBookmark);
router.get('/forums/:postId', forumController.getPostById);
router.get('/forums/:postId/comments', forumController.getComments);
router.post('/forums/:postId/comments', forumController.createComment);
router.put('/forums/:postId', forumController.updatePost);
router.delete('/forums/:postId', forumController.deletePost);
router.put('/forums/:postId/comments/:commentId', forumController.updateComment);
router.delete('/forums/:postId/comments/:commentId', forumController.deleteComment);
router.put('/forums/:postId/comments/:commentId/toggle-like', forumController.toggleCommentLike);

module.exports = router;