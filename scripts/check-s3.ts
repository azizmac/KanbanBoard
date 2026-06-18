// Validate S3/MinIO config: put → get → delete a tiny object in the bucket.
//   npx tsx scripts/check-s3.ts
import "dotenv/config";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

async function main() {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  if (!endpoint || !bucket) {
    console.error("S3_ENDPOINT / S3_BUCKET are not set in .env");
    process.exit(1);
  }
  console.log(`endpoint=${endpoint}  bucket=${bucket}`);

  const s3 = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? "",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "",
    },
  });

  const Key = "healthcheck.txt";
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key, Body: "ok", ContentType: "text/plain" }));
  const got = await s3.send(new GetObjectCommand({ Bucket: bucket, Key }));
  const body = await got.Body!.transformToString();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key }));

  console.log(body === "ok" ? "S3 round-trip OK ✓" : `unexpected body: ${body}`);
}

main().catch((e) => {
  console.error(`S3 check FAILED: ${e.name} — ${e.message}`);
  process.exit(2);
});
