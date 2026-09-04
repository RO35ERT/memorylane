import { Readable } from "stream";
import { auth } from "@/lib/auth";
import { getDriveClient } from "@/lib/google-drive";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = session.accessToken;
  if (!accessToken) {
    return NextResponse.json(
      { error: "No Drive access token. Please sign out and sign in again." },
      { status: 401 }
    );
  }

  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!rootFolderId) {
    return NextResponse.json(
      { error: "GOOGLE_DRIVE_ROOT_FOLDER_ID is not configured." },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const caption = (formData.get("caption") as string) || "";
    const yearMonth =
      (formData.get("yearMonth") as string) ||
      new Date().toISOString().slice(0, 7);

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const drive = getDriveClient(accessToken);

    // 1. Find or create the chapter subfolder (e.g. "2026-09")
    // includeItemsFromAllDrives ensures we see folders created by other editors
    const existingFolders = await drive.files.list({
      q: `'${rootFolderId}' in parents and name='${yearMonth}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id)",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });

    let folderId: string;
    if (existingFolders.data.files && existingFolders.data.files.length > 0) {
      // Folder already exists — reuse it regardless of who created it
      folderId = existingFolders.data.files[0].id!;
    } else {
      const created = await drive.files.create({
        requestBody: {
          name: yearMonth,
          mimeType: "application/vnd.google-apps.folder",
          parents: [rootFolderId],
        },
        fields: "id",
        supportsAllDrives: true,
      });
      folderId = created.data.id!;
    }

    // 2. Upload the file into the chapter folder
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploaded = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [folderId],
      },
      media: {
        mimeType: file.type,
        body: Readable.from(buffer),
      },
      fields: "id, name, mimeType, webViewLink",
      supportsAllDrives: true,
    });

    // 3. If caption provided, save it as a companion .txt file
    if (caption.trim()) {
      const timestamp = new Date().toISOString();
      const author = session.user?.email || "unknown";
      const noteContent = `${caption}\n\n<!-- meta: ${timestamp} | ${author} -->`;

      await drive.files.create({
        requestBody: {
          name: `note_${uploaded.data.id}.txt`,
          parents: [folderId],
        },
        media: {
          mimeType: "text/plain",
          body: Readable.from(Buffer.from(noteContent, "utf-8")),
        },
        supportsAllDrives: true,
      });
    }

    return NextResponse.json({ success: true, file: uploaded.data });
  } catch (err) {
    console.error("[upload] Error:", err);
    return NextResponse.json(
      { error: "Upload failed. Check server logs." },
      { status: 500 }
    );
  }
}
