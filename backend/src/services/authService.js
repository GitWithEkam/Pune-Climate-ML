import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

function publicUser(user) {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export class AuthService {
  constructor({ config, store }) {
    this.config = config;
    this.store = store;
  }

  async register(input, { createdByAdmin = false } = {}) {
    if (await this.store.findUserByEmail(input.email)) {
      const error = new Error("An account with this email already exists");
      error.status = 409;
      throw error;
    }
    const requestedRole = input.role || "urban_planner";
    const role = createdByAdmin || this.config.allowRoleSelfAssignment ? requestedRole : "urban_planner";
    const now = new Date().toISOString();
    const user = {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      role,
      passwordHash: await bcrypt.hash(input.password, 12),
      createdAt: now,
      updatedAt: now,
    };
    await this.store.saveUser(user);
    return publicUser(user);
  }

  async login({ email, password }) {
    const user = await this.store.findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      const error = new Error("Invalid email or password");
      error.status = 401;
      throw error;
    }
    return { user: publicUser(user), ...(await this.issueTokenPair(user)) };
  }

  async issueTokenPair(user) {
    const sessionId = crypto.randomUUID();
    const accessToken = jwt.sign(
      { sub: user.id, role: user.role, email: user.email, type: "access" },
      this.config.jwtAccessSecret,
      { expiresIn: this.config.accessTokenTtl, issuer: "pune-climate-api", audience: "pune-climate-client" },
    );
    const refreshToken = jwt.sign(
      { sub: user.id, jti: sessionId, type: "refresh" },
      this.config.jwtRefreshSecret,
      { expiresIn: this.config.refreshTokenTtl, issuer: "pune-climate-api", audience: "pune-climate-client" },
    );
    const decoded = jwt.decode(refreshToken);
    await this.store.saveRefreshSession({
      id: sessionId,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });
    return { accessToken, refreshToken, tokenType: "Bearer", expiresIn: this.config.accessTokenTtl };
  }

  verifyAccessToken(token) {
    return jwt.verify(token, this.config.jwtAccessSecret, {
      issuer: "pune-climate-api",
      audience: "pune-climate-client",
    });
  }

  async refresh(refreshToken) {
    let payload;
    try {
      payload = jwt.verify(refreshToken, this.config.jwtRefreshSecret, {
        issuer: "pune-climate-api",
        audience: "pune-climate-client",
      });
    } catch {
      const error = new Error("Invalid or expired refresh token");
      error.status = 401;
      throw error;
    }
    const session = await this.store.getRefreshSession(payload.jti);
    if (!session || session.tokenHash !== hashToken(refreshToken) || new Date(session.expiresAt) <= new Date()) {
      const error = new Error("Refresh token has been revoked");
      error.status = 401;
      throw error;
    }
    const user = await this.store.getUser(payload.sub);
    if (!user) {
      const error = new Error("User no longer exists");
      error.status = 401;
      throw error;
    }
    await this.store.deleteRefreshSession(payload.jti);
    return { user: publicUser(user), ...(await this.issueTokenPair(user)) };
  }

  async logout(refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, this.config.jwtRefreshSecret, {
        issuer: "pune-climate-api",
        audience: "pune-climate-client",
      });
      await this.store.deleteRefreshSession(payload.jti);
    } catch {
      // Logout is intentionally idempotent.
    }
  }

  async ensureBootstrapAdmin() {
    const { bootstrapAdminEmail: email, bootstrapAdminPassword: password } = this.config;
    if (!email || !password || await this.store.findUserByEmail(email.toLowerCase())) return;
    await this.register({ name: "Platform Administrator", email: email.toLowerCase(), password, role: "admin" }, { createdByAdmin: true });
  }
}
