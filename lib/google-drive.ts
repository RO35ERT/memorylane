import { google } from "googleapis";

export const getDriveClient = (accessToken: string) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET,
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.drive({ version: "v3", auth: oauth2Client });
};

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
};

export type Chapter = {
  folderName: string; // e.g. "2026-09"
  files: DriveFile[];
};

// Returns all chapter folders with their files, newest first
export const listChapters = async (
  accessToken: string,
  rootFolderId: string
): Promise<Chapter[]> => {
  const drive = getDriveClient(accessToken);

  // 1. Get all month subfolders
  const foldersRes = await drive.files.list({
    q: `'${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    orderBy: "name desc",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  const folders = foldersRes.data.files || [];

  // 2. For each folder fetch its files (exclude companion .txt notes)
  const chapters = await Promise.all(
    folders.map(async (folder) => {
      const filesRes = await drive.files.list({
        q: `'${folder.id}' in parents and trashed=false and not name contains 'note_'`,
        fields: "files(id, name, mimeType, createdTime)",
        orderBy: "createdTime desc",
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      });

      return {
        folderName: folder.name!,
        files: (filesRes.data.files || []) as DriveFile[],
      };
    })
  );

  // Only return chapters that have at least one file
  return chapters.filter((c) => c.files.length > 0);
};
