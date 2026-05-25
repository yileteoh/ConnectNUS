// frontend/app/forum-details/[id].js
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, TextInput,
  ActivityIndicator, SafeAreaView, Platform, StatusBar, KeyboardAvoidingView, FlatList, Keyboard, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../firebaseConfig';
import { 
  getForumDetails, getPostComments, addComment, togglePostLike, 
  deleteForumPost, updateComment, deleteComment, toggleCommentLike
} from '../../services/forumService';

const getRelativeTime = (timeData) => {
  if (!timeData) return 'Just now';
  let date;
  if (timeData._seconds) date = new Date(timeData._seconds * 1000);
  else if (timeData.seconds) date = new Date(timeData.seconds * 1000);
  else date = new Date(timeData); 
  if (isNaN(date.getTime())) return 'Just now';
  const diff = Date.now() - date.getTime();
  if (diff < 0) return 'Just now';
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export default function ForumDetailsScreen() {
  const { id } = useLocalSearchParams(); 
  const router = useRouter();
  
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  
  // Inline Comment Editing States
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');

  const currentUserId = auth.currentUser?.uid;

  const fetchPostAndComments = useCallback(async () => {
    try {
      const [postData, commentsData] = await Promise.all([
        getForumDetails(id),
        getPostComments(id)
      ]);
      setPost(postData);
      setComments(commentsData);
    } catch (error) {
      router.replace('/(tabs)/forum');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchPostAndComments(); }, [fetchPostAndComments]);

  const handleProfileNav = (targetUid) => {
    if (targetUid === currentUserId) router.push('/(tabs)/profile');
    else router.push(`/user/${targetUid}`);
  };

  const handleToggleLike = async () => {
    if (!currentUserId || !post) return;
    const hasLiked = post.likes?.includes(currentUserId);
    const newLikes = hasLiked 
      ? post.likes.filter(uid => uid !== currentUserId) 
      : [...(post.likes || []), currentUserId];
    setPost({ ...post, likes: newLikes });
    try { await togglePostLike(id, currentUserId); } 
    catch (error) { fetchPostAndComments(); }
  };

  const handlePostDelete = () => {
    Alert.alert('Delete Post', 'This will permanently erase your thread.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteForumPost(id, currentUserId);
            Alert.alert('Deleted', 'Post successfully removed.');
            router.replace('/(tabs)/forum');
          } catch (error) { Alert.alert('Error', error.message); }
      }}
    ]);
  };

  const handleSendComment = async () => {
    if (!inputText.trim() || !currentUserId) return;
    setSending(true);
    Keyboard.dismiss();
    try {
      await addComment(id, currentUserId, inputText.trim());
      setInputText('');
      setComments(await getPostComments(id));
    } catch (error) { Alert.alert('Error', error.message); } 
    finally { setSending(false); }
  };

  const handleCommentDelete = (commentId) => {
    Alert.alert('Delete Comment', 'Remove this comment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteComment(id, commentId, currentUserId);
            setComments(await getPostComments(id)); // Refresh automatically
          } catch (error) { Alert.alert('Error', error.message); }
      }}
    ]);
  };

  const handleToggleCommentLike = async (commentId) => {
    if (!currentUserId) return;

    // Optimistically update the UI instantly
    setComments(currentComments => currentComments.map(comment => {
      if (comment.id === commentId) {
        const likes = comment.likes || [];
        const isLiked = likes.includes(currentUserId);
        const newLikes = isLiked 
          ? likes.filter(uid => uid !== currentUserId) 
          : [...likes, currentUserId];
        return { ...comment, likes: newLikes };
      }
      return comment;
    }));

    try {
      await toggleCommentLike(id, commentId, currentUserId);
    } catch (error) {
      // Silently revert if the server request fails
      setComments(await getPostComments(id));
    }
  };

  const saveCommentEdit = async (commentId) => {
    if (!editCommentText.trim()) return;
    try {
      await updateComment(id, commentId, currentUserId, editCommentText.trim());
      setEditingCommentId(null);
      setComments(await getPostComments(id));
    } catch (error) { Alert.alert('Error', error.message); }
  };

  if (loading || !post) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#002D5B" />
      </SafeAreaView>
    );
  }

  const isLiked = post.likes?.includes(currentUserId);
  const isPostCreator = post.creatorId === currentUserId;

  const PostHeader = () => (
    <View style={styles.postBodyCard}>
      <View style={styles.authorMetaRow}>
        <TouchableOpacity style={styles.authorRow} onPress={() => handleProfileNav(post.creatorId)}>
          {post.creatorPicUrl ? (
            <Image source={{ uri: post.creatorPicUrl }} style={styles.authorAvatar} />
          ) : (
            <Image source={require('../../assets/profile_image.jpg')} style={styles.authorAvatar} />
          )}
          <View>
            <Text style={styles.authorName}>{isPostCreator ? 'You' : post.creatorName}</Text>
            <Text style={styles.timeText}>{getRelativeTime(post.createdAt)} in {post.category}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <Text style={styles.postTitle}>{post.title}</Text>
      <Text style={styles.postContent}>{post.content}</Text>
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleToggleLike}>
          <Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color={isLiked ? "#E1306C" : "#666"} />
          <Text style={[styles.actionText, isLiked && { color: '#E1306C', fontWeight: 'bold' }]}>
            {post.likes?.length || 0} Likes
          </Text>
        </TouchableOpacity>
        <View style={styles.actionBtn}>
          <Ionicons name="chatbox-outline" size={20} color="#666" />
          <Text style={styles.actionText}>{comments.length} Comments</Text>
        </View>
      </View>
      <View style={styles.sectionDivider} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#002D5B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thread</Text>
        <View style={{ flexDirection: 'row' }}>
          {isPostCreator ? (
            <>
              <TouchableOpacity style={styles.headerIcon} onPress={() => router.push(`/edit-forum/${id}`)}>
                <Ionicons name="pencil" size={20} color="#002D5B" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIcon} onPress={handlePostDelete}>
                <Ionicons name="trash-outline" size={22} color="#D32F2F" />
              </TouchableOpacity>
            </>
          ) : <View style={{ width: 28 }} />}
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flexContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={PostHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isCommentCreator = item.userId === currentUserId;
            const isEditing = editingCommentId === item.id;

            const commentLikes = item.likes || [];
            const isCommentLiked = commentLikes.includes(currentUserId);

            return (
              <View style={styles.commentItem}>
                <TouchableOpacity onPress={() => handleProfileNav(item.userId)}>
                  {item.userPicUrl ? (
                    <Image source={{ uri: item.userPicUrl }} style={styles.commentAvatar} />
                  ) : <Image source={require('../../assets/profile_image.jpg')} style={styles.commentAvatar} />}
                </TouchableOpacity>
                
                <View style={styles.commentBubble}>
                  <View style={styles.commentHeader}>
                    <View>
                      <Text style={styles.commentAuthorName}>{isCommentCreator ? 'You' : item.userName}</Text>
                      <Text style={styles.commentTime}>{getRelativeTime(item.createdAt)}</Text>
                    </View>
                    
                    {/* Inline Comment Actions */}
                    {isCommentCreator && !isEditing && (
                      <View style={styles.commentActions}>
                        <TouchableOpacity onPress={() => { setEditingCommentId(item.id); setEditCommentText(item.text); }} style={styles.miniBtn}>
                          <Ionicons name="pencil" size={14} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleCommentDelete(item.id)} style={styles.miniBtn}>
                          <Ionicons name="trash-outline" size={14} color="#D32F2F" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {isEditing ? (
                    <View style={styles.inlineEditBox}>
                      <TextInput 
                        style={styles.inlineInput} 
                        value={editCommentText} 
                        onChangeText={setEditCommentText} 
                        multiline 
                      />
                      <View style={styles.inlineEditActions}>
                        <TouchableOpacity onPress={() => setEditingCommentId(null)}>
                          <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => saveCommentEdit(item.id)} style={styles.saveBtn}>
                          <Text style={styles.saveText}>Save</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                    <Text style={styles.commentText}>{item.text}</Text>

                    <View style={styles.commentFooter}>
                        <TouchableOpacity 
                          style={styles.commentLikeBtn} 
                          onPress={() => handleToggleCommentLike(item.id)}
                        >
                          <Ionicons 
                            name={isCommentLiked ? "heart" : "heart-outline"} 
                            size={14} 
                            color={isCommentLiked ? "#E1306C" : "#888"} 
                          />
                          {commentLikes.length > 0 && (
                            <Text style={[styles.commentLikeText, isCommentLiked && { color: '#E1306C', fontWeight: 'bold' }]}>
                              {commentLikes.length}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </> 
                  )}
                </View>
              </View>
            );
          }}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput} placeholder="Add a comment..." placeholderTextColor="#999"
            value={inputText} onChangeText={setInputText} multiline maxLength={300}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSendComment} disabled={!inputText.trim() || sending}
          >
            {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={18} color="#FFF" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  flexContainer: { flex: 1 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#F0F0F0' },
  backButton: { padding: 4 },
  headerIcon: { padding: 4, marginLeft: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#002D5B', position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  listContent: { paddingBottom: 20 },
  postBodyCard: { backgroundColor: '#FFFFFF', padding: 20, marginBottom: 10 },
  authorMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  authorRow: { flexDirection: 'row', alignItems: 'center' },
  authorAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, borderWidth: 1, borderColor: '#EAEAEA' },
  authorName: { fontSize: 15, fontWeight: '700', color: '#333' },
  timeText: { fontSize: 12, color: '#888', marginTop: 2 },
  postTitle: { fontSize: 22, fontWeight: 'bold', color: '#002D5B', marginBottom: 12, lineHeight: 28 },
  postContent: { fontSize: 16, color: '#444', lineHeight: 26, marginBottom: 20 },
  actionBar: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
  actionText: { fontSize: 14, color: '#666', marginLeft: 6, fontWeight: '500' },
  sectionDivider: { height: 8, backgroundColor: '#FAFAFA', marginTop: 16, marginHorizontal: -20 },
  commentItem: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12, borderWidth: 1, borderColor: '#EAEAEA' },
  commentBubble: { flex: 1, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EAEAEA' },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  commentAuthorName: { fontSize: 13, fontWeight: '700', color: '#333' },
  commentTime: { fontSize: 11, color: '#999' },
  commentActions: { flexDirection: 'row' },
  miniBtn: { marginLeft: 12, padding: 2 },
  commentText: { fontSize: 14, color: '#555', lineHeight: 20 },
  inlineEditBox: { marginTop: 4 },
  inlineInput: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 8, fontSize: 13, color: '#333', minHeight: 60, textAlignVertical: 'top' },
  inlineEditActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8 },
  cancelText: { color: '#666', fontSize: 13, marginRight: 16, fontWeight: '600' },
  saveBtn: { backgroundColor: '#002D5B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  saveText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  textInput: { flex: 1, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15, maxHeight: 100, color: '#333' },
  sendButton: { backgroundColor: '#F28C28', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 10, marginBottom: 2 },
  sendButtonDisabled: { backgroundColor: '#CCC' },
  commentFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
  commentLikeBtn: { flexDirection: 'row', alignItems: 'center', padding: 4 },
  commentLikeText: { fontSize: 12, color: '#888', marginLeft: 4 }
});