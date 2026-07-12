import React from "react";
import "./Comments.css";

const Comments = ({
  comments = [],
  currentUserId = 0,
  commentText = "",
  onCommentTextChange = () => {},
  onSubmit = () => {},
  onDeleteComment = () => {},
  title = "แสดงความคิดเห็น",
  subtitle = "แบ่งปันความรู้สึกของคุณได้ที่นี่",
}) => {
  return (
    <section className="novel-detail__comments-section">
      <div className="novel-detail__comments-header">
        <div>
          <h4 className="novel-detail__section-title">{title}</h4>
          <p className="novel-detail__section-sub">{subtitle}</p>
        </div>
        <span className="novel-detail__comments-count">{comments.length} คอมเมนต์</span>
      </div>

      <form
        className="novel-detail__comment-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(commentText);
        }}
      >
        <textarea
          className="novel-detail__comment-input"
          value={commentText}
          onChange={onCommentTextChange}
          rows={3}
          placeholder="เขียนความรู้สึกของคุณที่นี่..."
        />
        <div className="novel-detail__comment-actions">
          <button type="submit" className="novel-detail__comment-button">
            ส่งความคิดเห็น
          </button>
        </div>
      </form>

      <div className="novel-detail__comments-list">
        {comments.length === 0 ? (
          <div className="novel-detail__comments-empty">ยังไม่มีความคิดเห็น เป็นคนแรกที่คอมเมนต์เลย 💖</div>
        ) : (
          comments.map((c) => (
            <article key={c.id || c.comment_id} className="novel-detail__comment-card">
              <div className="novel-detail__comment-avatar">💬</div>
              <div className="novel-detail__comment-body">
                <div className="novel-detail__comment-top">
                <span className="novel-detail__comment-user">{c.author || c.username || "ผู้ใช้งานนิรนาม"}</span>
                <div className="novel-detail__comment-meta">
                  <span className="novel-detail__comment-date">{c.createdAt || c.created_at || ""}</span>
                  {(c.user_id === currentUserId || c.userId === currentUserId) && (
                    <button
                      type="button"
                      className="novel-detail__comment-delete"
                      onClick={() => onDeleteComment(c.comment_id || c.id)}
                    >
                      ลบ
                    </button>
                  )}
                </div>
              </div>
              <p className="novel-detail__comment-content">{c.content || c.comment || ""}</p>
            </div>
          </article>
          ))
        )}
      </div>
    </section>
  );
};

export default Comments;
