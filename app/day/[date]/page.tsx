import { auth } from "@/lib/auth"
import { listChapters } from "@/lib/google-drive"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ImageIcon, VideoIcon, MicIcon, FileTextIcon, Heart, MessageCircle, ArrowLeft } from "lucide-react"
import DeleteButton from "../../components/DeleteButton"

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const session = await auth()
  if (!session) redirect("/auth/signin")

  const { date } = await params // YYYY-MM-DD
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  if (!rootFolderId) return <div>Missing GOOGLE_DRIVE_ROOT_FOLDER_ID</div>

  const chapters = session.accessToken
    ? await listChapters(session.accessToken, rootFolderId).catch(() => [])
    : []

  // Flatten and find files for this specific day
  const dayFiles = chapters
    .flatMap(c => c.files)
    .filter(f => f.createdTime.startsWith(date))
    .sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime())

  if (dayFiles.length === 0) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] p-8 flex flex-col items-center justify-center">
        <p className="mb-4">No memories found for this date.</p>
        <Link href="/" className="text-[#d4af37] underline">Back to Timeline</Link>
      </main>
    )
  }

  const dateObj = new Date(date + "T12:00:00Z") // Parse as midday to avoid timezone shift
  const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(dateObj)

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] font-sans selection:bg-[#d4af37] selection:text-black">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
        
        {/* Navigation */}
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-[#d4af37] transition-colors">
          <ArrowLeft size={20} />
          <span>Back to Timeline</span>
        </Link>

        {/* Header */}
        <header className="border-b border-[#222] pb-6">
          <h1 className="text-3xl font-serif text-[#d4af37]">{formattedDate}</h1>
          <p className="text-gray-500 mt-2">{dayFiles.length} {dayFiles.length === 1 ? "memory" : "memories"}</p>
        </header>

        {/* Scrapbook Cards */}
        <div className="space-y-12 pb-20">
          {dayFiles.map(file => {
            const src = `/api/media/${file.id}`
            let type: 'photo' | 'video' | 'voice' | 'text' = 'text'
            if (file.mimeType.startsWith('image/')) type = 'photo'
            else if (file.mimeType.startsWith('video/')) type = 'video'
            else if (file.mimeType.startsWith('audio/')) type = 'voice'

            return (
              <div key={file.id}>
                {/* PHOTO CARD */}
                {type === 'photo' && (
                  <div className="bg-white text-gray-900 rounded-2xl shadow-md overflow-hidden">
                    <div className="relative w-full bg-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={file.name} className="w-full h-auto object-cover" loading="lazy" />
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold text-xl mb-1">{file.name.replace(/\.[^/.]+$/, "")}</h3>
                      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-black/10 text-black/60">
                        <button className="flex items-center gap-1.5 hover:text-red-500 transition-colors"><Heart size={20} /></button>
                        <button className="flex items-center gap-1.5 hover:text-blue-500 transition-colors"><MessageCircle size={20} /></button>
                        <DeleteButton fileId={file.id} />
                      </div>
                    </div>
                  </div>
                )}

                {/* VIDEO CARD */}
                {type === 'video' && (
                  <div className="bg-blue-50 text-blue-950 rounded-2xl shadow-md overflow-hidden">
                    <div className="relative w-full bg-black">
                      <video src={src} controls className="w-full h-auto object-contain" preload="metadata" />
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold text-xl mb-1">{file.name.replace(/\.[^/.]+$/, "")}</h3>
                      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-black/10 text-black/60">
                        <button className="flex items-center gap-1.5 hover:text-red-500 transition-colors"><Heart size={20} /></button>
                        <button className="flex items-center gap-1.5 hover:text-blue-500 transition-colors"><MessageCircle size={20} /></button>
                        <DeleteButton fileId={file.id} />
                      </div>
                    </div>
                  </div>
                )}

                {/* VOICE NOTE CARD */}
                {type === 'voice' && (
                  <div className="bg-pink-100 text-pink-950 rounded-2xl shadow-md p-6">
                    <div className="flex items-start justify-between mb-6">
                      <h3 className="font-bold text-xl truncate pr-4">{file.name.replace(/\.[^/.]+$/, "")}</h3>
                      <DeleteButton fileId={file.id} />
                    </div>
                    <div className="flex items-center gap-4 bg-white/40 p-4 rounded-xl border border-pink-200/50">
                      <audio src={src} controls className="w-full h-12 outline-none" />
                    </div>
                  </div>
                )}

                {/* TEXT CARD */}
                {type === 'text' && (
                  <div className="bg-yellow-50 text-yellow-950 rounded-2xl shadow-md p-8 relative border border-yellow-100">
                    <div className="absolute top-6 right-6 flex items-center gap-3">
                      <DeleteButton fileId={file.id} />
                      <FileTextIcon size={24} className="text-yellow-600/50" />
                    </div>
                    <h3 className="font-bold text-xl mb-2">Note</h3>
                    <p className="text-sm text-yellow-700/70 font-medium mb-4 uppercase tracking-wider">{formattedDate}</p>
                    <p className="text-lg leading-relaxed text-yellow-900/80 font-serif italic break-words">
                      "{file.name.replace("note_", "").replace(".txt", "")}"
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
