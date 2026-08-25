-- Notifications table for push notifications
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),
  title           VARCHAR(255) NOT NULL,
  body            TEXT NOT NULL,
  type            VARCHAR(30) NOT NULL DEFAULT 'info',
  ref_table       VARCHAR(50),
  ref_id          UUID,
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
