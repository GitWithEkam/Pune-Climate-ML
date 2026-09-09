export const WRITE_ROLES = ["admin", "municipal_authority", "urban_planner", "environmental_consultant"];
export const ADMIN_ROLES = ["admin", "municipal_authority"];

export function authenticate(authService, { optional = false } = {}) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      if (optional) return next();
      return res.status(401).json({ error: "Bearer access token required" });
    }
    try {
      req.user = authService.verifyAccessToken(token);
      next();
    } catch {
      res.status(401).json({ error: "Invalid or expired access token" });
    }
  };
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "Insufficient permissions" });
    next();
  };
}

export function canAccessAssessment(user, project) {
  if (["admin", "municipal_authority", "public_viewer"].includes(user.role)) return true;
  return project.ownerId === user.sub;
}
