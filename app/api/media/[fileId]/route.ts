import { auth } from "@/lib/auth";
import { getDriveClient } from "@/lib/google-drive";
import { NextRequest, NextResponse } from "next/server";

// Proxies a Google Drive file through the app so the browser
// doesn't need its own Drive auth to display images/videos/audio.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const session = await auth();
  if (!session?.accessToken) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { fileId } = await params;

  const drive = getDriveClient(session.accessToken);

  try {
    const res = await drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
      { responseType: "stream" }
    );

    // Get content type from Drive metadata
    const meta = await drive.files.get({
      fileId,
      fields: "mimeType",
      supportsAllDrives: true,
    });
    const mimeType = meta.data.mimeType || "application/octet-stream";

    const headers = new Headers();
    headers.set("Content-Type", mimeType);
    headers.set("Cache-Control", "private, max-age=3600");

    // Stream the Drive response directly to the browser
    const stream = res.data as unknown as NodeJS.ReadableStream;
    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(webStream, { headers });
  } catch (err) {
    console.error("[media proxy] Error:", err);
    return new NextResponse("File not found", { status: 404 });
  }
}
