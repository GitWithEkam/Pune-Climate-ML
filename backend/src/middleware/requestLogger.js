import crypto from "node:crypto";
import pino from "pino";
import pinoHttp from "pino-http";

export function createRequestLogger(config) {
  const logger = pino({
    level: config.logLevel,
    redact: {
      paths: ["req.headers.authorization", "req.body.password", "req.body.refreshToken"],
      censor: "[REDACTED]",
    },
  });
  return pinoHttp({
    logger,
    genReqId(req, res) {
      const id = req.headers["x-request-id"] || crypto.randomUUID();
      res.setHeader("x-request-id", id);
      return id;
    },
    customProps: (req) => ({ userId: req.user?.sub, role: req.user?.role }),
  });
}
