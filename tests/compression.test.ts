import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { sendCompressedJson, computeETag } from "@/lib/compression";
import zlib from "node:zlib";

describe("Response Compression & ETag System", () => {
  it("does not compress small payloads (< 1024 bytes) to avoid overhead", () => {
    const req = new NextRequest("http://localhost:3000/api/test", {
      headers: { "accept-encoding": "gzip, deflate, br" },
    });
    const smallData = { success: true, message: "OK" };
    const res = sendCompressedJson(req, smallData);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-encoding")).toBeNull();
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("vary")).toBe("Accept-Encoding");
  });

  it("compresses large payloads with Brotli when supported by client", async () => {
    const req = new NextRequest("http://localhost:3000/api/test", {
      headers: { "accept-encoding": "gzip, deflate, br" },
    });
    const largeData = {
      students: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Student ${i}`,
        roll_no: `ROLL-${i}`,
        class: "10-A",
        marks: [85, 90, 78, 92, 88],
      })),
    };

    const res = sendCompressedJson(req, largeData);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-encoding")).toBe("br");
    expect(res.headers.get("vary")).toBe("Accept-Encoding");

    // Decompress with Brotli to verify data integrity
    const buffer = Buffer.from(await res.arrayBuffer());
    const decompressed = zlib.brotliDecompressSync(buffer).toString("utf-8");
    const parsed = JSON.parse(decompressed);

    expect(parsed.students.length).toBe(100);
    expect(parsed.students[0].name).toBe("Student 0");
  });

  it("compresses large payloads with Gzip when Brotli is not supported", async () => {
    const req = new NextRequest("http://localhost:3000/api/test", {
      headers: { "accept-encoding": "gzip, deflate" },
    });
    const largeData = {
      teachers: Array.from({ length: 50 }, (_, i) => ({
        id: i,
        name: `Teacher ${i}`,
        subject: "Mathematics",
        department: "Science",
      })),
    };

    const res = sendCompressedJson(req, largeData);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-encoding")).toBe("gzip");

    // Decompress with Gzip to verify data integrity
    const buffer = Buffer.from(await res.arrayBuffer());
    const decompressed = zlib.gunzipSync(buffer).toString("utf-8");
    const parsed = JSON.parse(decompressed);

    expect(parsed.teachers.length).toBe(50);
  });

  it("returns 304 Not Modified when ETag matches If-None-Match header", () => {
    const data = { success: true, count: 500 };
    const bodyStr = JSON.stringify(data);
    const etag = computeETag(bodyStr);

    const req = new NextRequest("http://localhost:3000/api/test", {
      headers: {
        "accept-encoding": "gzip, deflate, br",
        "if-none-match": etag,
      },
    });

    const res = sendCompressedJson(req, data);

    expect(res.status).toBe(304);
    expect(res.body).toBeNull();
  });
});
