import { auth } from "@/lib/auth"
import { listChapters } from "@/lib/google-drive"
import Link from "next/link"
import { redirect } from "next/navigation"
import SignOutButton from "./components/SignOutButton"
import { ImageIcon, VideoIcon, MicIcon, FileTextIcon, Heart, MessageCircle } from "lucide-react"

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
  // Note: unauthenticated redirect is handled by middleware.ts
  if (!session) return null
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  const chapters = rootFolderId && session.accessToken
    ? await listChapters(session.accessToken, rootFolderId).catch(() => [])
    : []

  // Flatten and sort files by creation time
  const allItems = chapters
    .flatMap(c => c.files)
    .sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime())

  // Group by exact date (YYYY-MM-DD)
  const groupedItems: { dateStr: string, formattedDate: string, files: typeof allItems }[] = [];
  allItems.forEach(file => {
    const dateObj = new Date(file.createdTime)
    if (isNaN(dateObj.getTime())) return;
    
    const dateStr = dateObj.toISOString().split('T')[0]
    const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(dateObj)
    
    const existing = groupedItems.find(g => g.dateStr === dateStr)
    if (existing) {
      existing.files.push(file)
    } else {
      groupedItems.push({ dateStr, formattedDate, files: [file] })
    }
  });

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] font-sans selection:bg-[#d4af37] selection:text-black overflow-x-hidden">
      <div className="max-w-4xl mx-auto px-4 space-y-10 pb-20">

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

        {/* Scrapbook Timeline */}
        <section className="relative mt-20 pt-10 pb-20">
          
          {/* Central Dashed Line */}
          {groupedItems.length > 0 && (
            <div className="absolute left-[60px] sm:left-[80px] md:left-1/2 top-0 bottom-0 w-px border-l-2 border-dashed border-[#d4af37]/40 -translate-x-1/2" />
          )}

          {groupedItems.length === 0 ? (
            <div className="text-center py-20 space-y-3 relative z-10">
              <p className="text-4xl">📷</p>
              <p className="text-gray-500 text-sm">No memories yet. Add your first one!</p>
            </div>
          ) : (
            <div className="space-y-16">
              {groupedItems.map((group, index) => {
                const isEven = index % 2 === 0
                const file = group.files[0] // The cover item (latest of the day)
                const src = `/api/media/${file.id}`
                
                let type: 'photo' | 'video' | 'voice' | 'text' = 'text'
                if (file.mimeType.startsWith('image/')) type = 'photo'
                else if (file.mimeType.startsWith('video/')) type = 'video'
                else if (file.mimeType.startsWith('audio/')) type = 'voice'

                return (
                  <div key={group.dateStr} className="relative flex flex-col md:flex-row items-start md:items-center w-full group/timeline">
                    
                    {/* Date Node */}
                    <div className="absolute left-[60px] sm:left-[80px] md:left-1/2 top-0 md:top-1/2 -translate-x-1/2 md:-translate-y-1/2 z-10 flex items-center justify-center mt-6 md:mt-0">
                      <span className="bg-[#0a0a0a] text-[#d4af37] border border-[#d4af37]/50 text-[10px] sm:text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap shadow-md transition-colors group-hover/timeline:bg-[#d4af37] group-hover/timeline:text-black">
                        {group.formattedDate}
                      </span>
                    </div>

                    {/* Connecting Line (Desktop) */}
                    <div className={`hidden md:block absolute top-1/2 w-8 border-t-2 border-dashed border-[#d4af37]/40 transition-colors group-hover/timeline:border-[#d4af37] ${isEven ? 'right-1/2 mr-4' : 'left-1/2 ml-4'}`} />

                    {/* Card Container (Clickable Cover) */}
                    <Link href={`/day/${group.dateStr}`} className={`w-full md:w-1/2 pl-[140px] sm:pl-[160px] pr-2 sm:pr-4 md:px-0 block focus:outline-none ${isEven ? 'md:pr-12' : 'md:pl-12 md:ml-auto'} mt-8 md:mt-0`}>
                      <div className="relative hover:-translate-y-2 transition-transform duration-300 shadow-xl rounded-2xl">
                        
                        {/* PHOTO CARD */}
                        {type === 'photo' && (
                          <div className="bg-white text-gray-900 rounded-2xl overflow-hidden">
                            <div className="relative w-full aspect-[4/3] bg-gray-200">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={src} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
                            </div>
                            <div className="p-5">
                              <h3 className="font-bold text-lg mb-1 truncate">{file.name.replace(/\.[^/.]+$/, "")}</h3>
                            </div>
                          </div>
                        )}

                        {/* VIDEO CARD */}
                        {type === 'video' && (
                          <div className="bg-blue-50 text-blue-950 rounded-2xl overflow-hidden">
                            <div className="relative w-full aspect-[4/3] bg-black">
                              <video src={src} className="w-full h-full object-contain pointer-events-none" preload="metadata" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="w-14 h-14 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/50">
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                </div>
                              </div>
                            </div>
                            <div className="p-5">
                              <h3 className="font-bold text-lg mb-1 truncate">{file.name.replace(/\.[^/.]+$/, "")}</h3>
                            </div>
                          </div>
                        )}

                        {/* VOICE NOTE CARD */}
                        {type === 'voice' && (
                          <div className="bg-pink-100 text-pink-950 rounded-2xl p-6">
                            <h3 className="font-bold text-lg mb-4 truncate">{file.name.replace(/\.[^/.]+$/, "")}</h3>
                            <div className="flex items-center gap-4 bg-white/40 p-3 rounded-xl border border-pink-200/50">
                              <div className="w-10 h-10 shrink-0 bg-pink-500 text-white rounded-full flex items-center justify-center shadow-sm">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                              </div>
                              <div className="flex-1 opacity-60">Voice Memo</div>
                            </div>
                          </div>
                        )}

                        {/* TEXT CARD */}
                        {type === 'text' && (
                          <div className="bg-yellow-50 text-yellow-950 rounded-2xl p-6 relative border border-yellow-100 min-h-[120px]">
                            <div className="absolute top-4 right-4 text-yellow-600/50">
                              <FileTextIcon size={20} />
                            </div>
                            <h3 className="font-bold text-lg mb-2 truncate">Note</h3>
                            <p className="text-sm leading-relaxed text-yellow-900/80 font-serif italic line-clamp-3">
                              "{file.name.replace("note_", "").replace(".txt", "")}"
                            </p>
                          </div>
                        )}

                        {/* Hover Overlay Badge (Shows item count if > 1) */}
                        {group.files.length > 1 && (
                          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg border border-white/20">
                            +{group.files.length - 1} more
                          </div>
                        )}
                        
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
