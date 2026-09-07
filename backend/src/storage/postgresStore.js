import pg from "pg";

export class PostgresStore {
  constructor(connectionString) {
    this.pool = new pg.Pool({ connectionString });
  }

  async init() {
    await this.pool.query("CREATE EXTENSION IF NOT EXISTS postgis");
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS assessments (
        id uuid PRIMARY KEY,
        payload jsonb NOT NULL,
        location geography(Point, 4326),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY,
        email text NOT NULL,
        payload jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS users_lower_email_idx ON users (lower(email));
      CREATE TABLE IF NOT EXISTS refresh_sessions (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash text NOT NULL,
        expires_at timestamptz NOT NULL,
        payload jsonb NOT NULL
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        payload jsonb NOT NULL,
        read_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at DESC);
    `);
  }

  async listAssessments() {
    const result = await this.pool.query("SELECT payload FROM assessments ORDER BY created_at DESC");
    return result.rows.map((row) => row.payload);
  }

  async getAssessment(id) {
    const result = await this.pool.query("SELECT payload FROM assessments WHERE id = $1", [id]);
    return result.rows[0]?.payload || null;
  }

  async saveAssessment(assessment) {
    const coordinates = assessment.input.coordinates;
    await this.pool.query(
      `INSERT INTO assessments (id, payload, location)
       VALUES ($1, $2, CASE WHEN $3::float8 IS NULL OR $4::float8 IS NULL THEN NULL
         ELSE ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography END)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, location = EXCLUDED.location`,
      [assessment.id, assessment, coordinates?.lat ?? null, coordinates?.lon ?? null],
    );
    return assessment;
  }

  async saveUser(user) {
    await this.pool.query(
      `INSERT INTO users (id, email, payload) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, payload = EXCLUDED.payload`,
      [user.id, user.email, user],
    );
    return user;
  }

  async findUserByEmail(email) {
    const result = await this.pool.query("SELECT payload FROM users WHERE lower(email) = lower($1)", [email]);
    return result.rows[0]?.payload || null;
  }

  async getUser(id) {
    const result = await this.pool.query("SELECT payload FROM users WHERE id = $1", [id]);
    return result.rows[0]?.payload || null;
  }

  async listUsers() {
    const result = await this.pool.query("SELECT payload FROM users ORDER BY created_at DESC");
    return result.rows.map((row) => row.payload);
  }

  async saveRefreshSession(session) {
    await this.pool.query(
      `INSERT INTO refresh_sessions (id, user_id, token_hash, expires_at, payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [session.id, session.userId, session.tokenHash, session.expiresAt, session],
    );
  }

  async getRefreshSession(id) {
    const result = await this.pool.query("SELECT payload FROM refresh_sessions WHERE id = $1", [id]);
    return result.rows[0]?.payload || null;
  }

  async deleteRefreshSession(id) {
    await this.pool.query("DELETE FROM refresh_sessions WHERE id = $1", [id]);
  }

  async saveNotification(notification) {
    await this.pool.query(
      `INSERT INTO notifications (id, user_id, payload, read_at, created_at) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, read_at = EXCLUDED.read_at`,
      [notification.id, notification.userId, notification, notification.readAt, notification.createdAt],
    );
    return notification;
  }

  async listNotifications(userId) {
    const result = await this.pool.query(
      "SELECT payload || jsonb_build_object('readAt', read_at) AS payload FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    return result.rows.map((row) => row.payload);
  }

  async markNotificationRead(id, userId) {
    const readAt = new Date().toISOString();
    const result = await this.pool.query(
      `UPDATE notifications SET read_at = $3
       WHERE id = $1 AND user_id = $2
       RETURNING payload || jsonb_build_object('readAt', read_at) AS payload`,
      [id, userId, readAt],
    );
    return result.rows[0]?.payload || null;
  }
}
