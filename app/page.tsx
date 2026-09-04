import { auth } from "@/lib/auth"
import { listChapters } from "@/lib/google-drive"
import Link from "next/link"
import { redirect } from "next/navigation"
import SignOutButton from "./components/SignOutButton"
import { ImageIcon, VideoIcon, MicIcon, FileTextIcon } from "lucide-react"

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]

function formatFolderName(name: string) {
  // "2026-09" → "September 2026"
  const [year, month] = name.split("-")
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`
}

function MediaIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="w-4 h-4" />
  if (mimeType.startsWith("video/")) return <VideoIcon className="w-4 h-4" />
  if (mimeType.startsWith("audio/")) return <MicIcon className="w-4 h-4" />
  return <FileTextIcon className="w-4 h-4" />
}

function MediaItem({ file }: { file: { id: string; name: string; mimeType: string; createdTime: string } }) {
  const src = `/api/media/${file.id}`

  if (file.mimeType.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={file.name}
        className="w-full h-auto object-cover block"
        loading="lazy"
      />
    )
  }
  if (file.mimeType.startsWith("video/")) {
    return (
      <video
        src={src}
        controls
        className="w-full h-auto block"
        preload="metadata"
      />
    )
  }
  if (file.mimeType.startsWith("audio/")) {
    return (
      <div className="flex items-center gap-4 p-5 bg-gradient-to-br from-[#111] to-[#0a0a0a]">
        <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0 border border-[#333]">
          <MicIcon className="w-5 h-5 text-[#d4af37]" />
        </div>
        <audio src={src} controls className="w-full h-8 outline-none" />
      </div>
    )
  }
  // Text / other
  return (
    <div className="p-6 bg-gradient-to-br from-[#111] to-[#0a0a0a]">
      <div className="flex items-center gap-3 text-[#d4af37] mb-3">
        <FileTextIcon className="w-4 h-4" />
        <span className="text-xs font-semibold tracking-wider uppercase">Note</span>
      </div>
      <p className="text-gray-300 font-serif leading-relaxed text-lg break-words">
        {file.name.replace("note_", "").replace(".txt", "")} 
        {/* We can fetch text content later, but for now we just show it gracefully */}
      </p>
    </div>
  )
}

export default async function Home() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  const chapters = rootFolderId && session.accessToken
    ? await listChapters(session.accessToken, rootFolderId).catch(() => [])
    : []

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] font-sans selection:bg-[#d4af37] selection:text-black">
      <div className="max-w-2xl mx-auto px-4 space-y-10 pb-20">

        {/* Header */}
        <header className="flex flex-col items-center text-center space-y-3 pt-14 pb-4">
          <h1 className="text-4xl font-serif tracking-wide text-[#d4af37]">Memory Lane</h1>
          <p className="text-[#f0e1e1]/60 max-w-xs font-light text-sm leading-relaxed">
            A private digital time capsule for the moments we want to keep forever.
          </p>
        </header>

        {/* User bar */}
        <section className="glass-panel px-5 py-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{session!.user?.name || "Love"}</p>
            <SignOutButton />
          </div>
          <Link
            href="/upload"
            className="px-5 py-2 rounded-full bg-[#d4af37] text-black font-semibold text-sm hover:bg-[#c4a030] active:scale-95 transition-all"
          >
            + Add Memory
          </Link>
        </section>

        {/* Timeline */}
        <section className="space-y-10">
          <h2 className="text-xl font-serif border-b border-[#1f1f1f] pb-3 text-gray-300">Timeline</h2>

          {chapters.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <p className="text-4xl">📷</p>
              <p className="text-gray-500 text-sm">No memories yet. Add your first one!</p>
            </div>
          ) : (
            chapters.map((chapter) => (
              <div key={chapter.folderName} className="space-y-4">
                {/* Chapter heading */}
                <h3 className="text-xs font-semibold tracking-widest text-[#d4af37] uppercase">
                  {formatFolderName(chapter.folderName)}
                </h3>

                {/* Files grid (Masonry) */}
                <div className="columns-1 sm:columns-2 gap-4 space-y-4">
                  {chapter.files.map((file) => (
                    <div key={file.id} className="break-inside-avoid relative group rounded-2xl overflow-hidden bg-[#111] border border-[#222] hover:border-[#d4af37]/30 transition-all duration-500">
                      <MediaItem file={file} />
                      
                      {/* Overlay for icon (hidden until hover on desktop, or subtle on mobile) */}
                      <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md p-1.5 rounded-full text-white/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <MediaIcon mimeType={file.mimeType} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  )
}
