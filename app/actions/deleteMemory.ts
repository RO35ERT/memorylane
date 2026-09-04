"use server"

import { auth } from "@/lib/auth"
import { getDriveClient } from "@/lib/google-drive"
import { revalidatePath } from "next/cache"

export async function deleteMemory(fileId: string) {
  const session = await auth()
  if (!session?.accessToken) {
    throw new Error("Unauthorized")
  }

  const drive = getDriveClient(session.accessToken)

  try {
    // We move it to trash rather than permanently deleting, just to be safe.
    await drive.files.update({
      fileId,
      requestBody: {
        trashed: true,
      },
      supportsAllDrives: true,
    })

    // Also try to find and trash any companion .txt notes
    try {
      const notesRes = await drive.files.list({
        q: `name = 'note_${fileId}.txt' and trashed = false`,
        fields: "files(id)",
        supportsAllDrives: true,
      })
      if (notesRes.data.files && notesRes.data.files.length > 0) {
        await drive.files.update({
          fileId: notesRes.data.files[0].id!,
          requestBody: { trashed: true },
          supportsAllDrives: true,
        })
      }
    } catch (e) {
      // Ignore errors finding/trashing the companion note
    }

    revalidatePath("/")
    revalidatePath("/day/[date]", "page")
    
    return { success: true }
  } catch (error) {
    console.error("[deleteMemory] Error:", error)
    throw new Error("Failed to delete memory")
  }
}
