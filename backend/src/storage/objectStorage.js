import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Storage } from "@google-cloud/storage";

const safeName = (name) => path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
const objectKey = (assessmentId, name) => `assessments/${assessmentId}/${crypto.randomUUID()}-${safeName(name)}`;

class LocalObjectStorage {
  constructor(root) { this.root = root; this.provider = "local"; }
  async init() { await fsp.mkdir(this.root, { recursive: true }); }
  async save(file, assessmentId) {
    const key = objectKey(assessmentId, file.originalname);
    const destination = path.join(this.root, ...key.split("/"));
    await fsp.mkdir(path.dirname(destination), { recursive: true });
    await fsp.writeFile(destination, file.buffer);
    return { key, provider: this.provider };
  }
  async get(key) {
    const resolved = path.resolve(this.root, ...key.split("/"));
    if (!resolved.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Invalid object key");
    return fs.createReadStream(resolved);
  }
}

class S3ObjectStorage {
  constructor(config) {
    if (!config.awsS3Bucket) throw new Error("AWS_S3_BUCKET is required for S3 storage");
    this.client = new S3Client({ region: config.awsRegion });
    this.bucket = config.awsS3Bucket;
    this.provider = "s3";
  }
  async init() {}
  async save(file, assessmentId) {
    const key = objectKey(assessmentId, file.originalname);
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: file.buffer, ContentType: file.mimetype }));
    return { key, provider: this.provider };
  }
  async get(key) {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return result.Body;
  }
}

class FirebaseObjectStorage {
  constructor(config) {
    if (!config.firebaseStorageBucket) throw new Error("FIREBASE_STORAGE_BUCKET is required for Firebase storage");
    const storage = new Storage({ keyFilename: config.firebaseServiceAccountPath });
    this.bucket = storage.bucket(config.firebaseStorageBucket);
    this.provider = "firebase";
  }
  async init() {}
  async save(file, assessmentId) {
    const key = objectKey(assessmentId, file.originalname);
    await this.bucket.file(key).save(file.buffer, { resumable: false, metadata: { contentType: file.mimetype } });
    return { key, provider: this.provider };
  }
  async get(key) { return this.bucket.file(key).createReadStream(); }
}

export async function createObjectStorage(config) {
  let storage;
  if (config.fileStorageProvider === "s3") storage = new S3ObjectStorage(config);
  else if (config.fileStorageProvider === "firebase") {
    if (!config.firebaseServiceAccountPath) throw new Error("FIREBASE_SERVICE_ACCOUNT_PATH is required for Firebase storage");
    storage = new FirebaseObjectStorage(config);
  } else storage = new LocalObjectStorage(config.uploadDirectory);
  await storage.init();
  return storage;
}
