"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ImageIcon,
  VideoIcon,
  MicIcon,
  FileTextIcon,
  XIcon,
  CameraIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  LoaderIcon,
  AlertTriangleIcon,
  RotateCwIcon
} from "lucide-react"

type MemoryType = "photo" | "video" | "audio" | "text"
type ItemStatus = "idle" | "compressing" | "uploading" | "success" | "error"

interface UploadItem {
  id: string
  file: File
  previewUrl?: string
  status: ItemStatus
  errorMsg?: string
}

const VERCEL_MAX_BYTES = 4.5 * 1024 * 1024 // 4.5 MB Vercel Serverless body limit

const TYPE_CONFIG: Record<MemoryType, {
  label: string
  icon: React.ReactNode
  accept: string
  capture?: "user" | "environment"
}> = {
  photo: {
    label: "Photo",
    icon: <ImageIcon className="w-5 h-5" />,
    accept: "image/*",
    capture: "environment",
  },
  video: {
    label: "Video",
    icon: <VideoIcon className="w-5 h-5" />,
    accept: "video/*",
    capture: "environment",
  },
  audio: {
    label: "Voice Memo",
    icon: <MicIcon className="w-5 h-5" />,
    accept: "audio/*",
    capture: "user",
  },
  text: {
    label: "Text Note",
    icon: <FileTextIcon className="w-5 h-5" />,
    accept: "",
  },
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Resizes and compresses images in the browser before upload to prevent
 * hitting Vercel's 4.5 MB serverless payload limit and speed up uploads.
 */
async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type.includes("svg") || file.type.includes("gif")) {
    return file
  }
  // If file is already under 1 MB, no need to compress
  if (file.size <= 1024 * 1024) {
    return file
  }

  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const maxDim = 2048
      let { width, height } = img

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        resolve(file)
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            const newName = file.name.replace(/\.[^/.]+$/, ".jpg")
            resolve(new File([blob], newName, { type: "image/jpeg" }))
          } else {
            resolve(file)
          }
        },
        "image/jpeg",
        0.85
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }

    img.src = objectUrl
  })
}

export default function UploadForm() {
  const router = useRouter()
  const [type, setType] = useState<MemoryType>("photo")
  const [items, setItems] = useState<UploadItem[]>([])
  const [note, setNote] = useState("")
  const [yearMonth, setYearMonth] = useState(new Date().toISOString().slice(0, 7))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [globalStatus, setGlobalStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
  const [globalError, setGlobalError] = useState("")
  const [isRecording, setIsRecording] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])

  const config = TYPE_CONFIG[type]

  const handleTypeChange = (t: MemoryType) => {
    // Revoke old previews
    items.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    })

    setType(t)
    setItems([])
    setNote("")
    setGlobalStatus("idle")
    setGlobalError("")
    setIsRecording(false)

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.addEventListener("dataavailable", (event) => {
        audioChunksRef.current.push(event.data)
      })

      mediaRecorder.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        const audioFile = new File([audioBlob], `voice_memo_${Date.now()}.webm`, { type: "audio/webm" })
        setItems([
          {
            id: Math.random().toString(36).substring(2, 9),
            file: audioFile,
            status: "idle",
          },
        ])
        stream.getTracks().forEach((track) => track.stop())
        setIsRecording(false)
      })

      mediaRecorder.start()
      setIsRecording(true)
    } catch {
      setGlobalError("Microphone access denied or unavailable.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length === 0) return

    const newItems: UploadItem[] = selected.map((f) => ({
      id: Math.random().toString(36).substring(2, 9),
      file: f,
      previewUrl:
        f.type.startsWith("image/") || f.type.startsWith("video/")
          ? URL.createObjectURL(f)
          : undefined,
      status: "idle",
    }))

    // For photo, allow appending or replacing. Here we append to allow selecting from multiple sources
    setItems((prev) => [...prev, ...newItems])
    setGlobalStatus("idle")
    setGlobalError("")

    // Reset input so same file can be re-selected if removed
    if (e.target) e.target.value = ""
  }

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((item) => item.id !== id)
    })
  }

  const clearAllFiles = () => {
    items.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    })
    setItems([])
    setGlobalStatus("idle")
    setGlobalError("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Upload a single file item to /api/upload
  const uploadSingleItem = async (item: UploadItem, captionText: string): Promise<boolean> => {
    try {
      // 1. Compress image if needed
      let fileToUpload = item.file
      if (fileToUpload.type.startsWith("image/")) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "compressing" } : i))
        )
        fileToUpload = await compressImageIfNeeded(fileToUpload)
      }

      // 2. Set item to uploading
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "uploading", errorMsg: undefined } : i))
      )

      const formData = new FormData()
      formData.append("file", fileToUpload)
      formData.append("caption", captionText)
      formData.append("yearMonth", yearMonth)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        const message = data?.error || `Upload failed with status ${res.status}`
        throw new Error(message)
      }

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "success" } : i))
      )
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed"
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "error", errorMsg: message } : i))
      )
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (type !== "text" && items.length === 0) {
      setGlobalError("Please select at least one file.")
      setGlobalStatus("error")
      return
    }

    if (type === "text" && !note.trim()) {
      setGlobalError("Please write something before saving.")
      setGlobalStatus("error")
      return
    }

    setIsSubmitting(true)
    setGlobalStatus("uploading")
    setGlobalError("")

    // Handle Text Note
    if (type === "text") {
      try {
        const textBlob = new Blob([note], { type: "text/plain" })
        const textFile = new File([textBlob], `note_${Date.now()}.txt`, { type: "text/plain" })

        const formData = new FormData()
        formData.append("file", textFile)
        formData.append("caption", note)
        formData.append("yearMonth", yearMonth)

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        const data = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(data?.error || "Failed to save note.")
        }

        setGlobalStatus("success")
        setTimeout(() => router.push("/"), 1500)
      } catch (err) {
        setGlobalError(err instanceof Error ? err.message : "Failed to save note.")
        setGlobalStatus("error")
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // Handle Media Files (Sequential single uploads with live progress)
    // Only upload items that are not yet marked as 'success'
    const pendingItems = items.filter((item) => item.status !== "success")

    let successCount = items.filter((item) => item.status === "success").length
    let failedCount = 0

    for (const item of pendingItems) {
      const ok = await uploadSingleItem(item, note)
      if (ok) {
        successCount++
      } else {
        failedCount++
      }
    }

    setIsSubmitting(false)

    if (failedCount === 0) {
      setGlobalStatus("success")
      setTimeout(() => router.push("/"), 1500)
    } else {
      setGlobalStatus("error")
      setGlobalError(
        `${failedCount} of ${items.length} uploads failed. Check each item below and retry.`
      )
    }
  }

  // Calculate progress stats
  const totalCount = items.length
  const completedCount = items.filter((i) => i.status === "success").length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Check for oversized video files
  const oversizedVideo =
    type === "video" && items.some((i) => i.file.size > VERCEL_MAX_BYTES)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Memory type selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-400 tracking-wider uppercase">
          Type
        </label>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(TYPE_CONFIG) as MemoryType[]).map((t) => (
            <button
              key={t}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleTypeChange(t)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-medium transition-all ${
                type === t
                  ? "border-[#d4af37] text-[#d4af37] bg-[#d4af37]/10"
                  : "border-[#333] text-gray-400 hover:border-[#555]"
              }`}
            >
              {TYPE_CONFIG[t].icon}
              <span>{TYPE_CONFIG[t].label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Month picker */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-400 tracking-wider uppercase">
          When
        </label>
        <input
          type="month"
          value={yearMonth}
          disabled={isSubmitting}
          onChange={(e) => setYearMonth(e.target.value)}
          className="w-full bg-[#111] border border-[#333] rounded-xl p-3 text-white focus:outline-none focus:border-[#d4af37] transition-colors"
        />
      </div>

      {/* File picker & Previews */}
      {type !== "text" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-400 tracking-wider uppercase">
              Files {items.length > 0 && `(${items.length})`}
            </label>
            {items.length > 0 && !isSubmitting && (
              <button
                type="button"
                onClick={clearAllFiles}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Vercel payload limit warning for videos */}
          {oversizedVideo && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300 leading-relaxed">
              <AlertTriangleIcon className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <strong>Video size advisory:</strong> One or more selected videos exceeds{" "}
                {formatBytes(VERCEL_MAX_BYTES)}. Vercel Serverless Functions enforce a 4.5 MB
                request limit. Large videos may be rejected by the serverless gateway.
              </div>
            </div>
          )}

          {/* Live Multi-File Progress Bar during upload */}
          {isSubmitting && totalCount > 0 && (
            <div className="bg-[#111] border border-[#333] rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#d4af37] flex items-center gap-1.5">
                  <LoaderIcon className="w-3.5 h-3.5 animate-spin" />
                  Uploading {completedCount + 1} of {totalCount}...
                </span>
                <span className="text-gray-400 font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full bg-[#222] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#d4af37] to-amber-300 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Grid of selected files with status */}
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto p-1">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="relative rounded-xl overflow-hidden aspect-square bg-[#141414] border border-[#262626] group flex flex-col justify-end"
                  >
                    {/* Visual Preview */}
                    {type === "photo" && item.previewUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.previewUrl}
                        alt={`Preview ${index}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    {type === "video" && item.previewUrl && (
                      <video
                        src={item.previewUrl}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    {type === "audio" && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-[#181818]">
                        <MicIcon className="w-7 h-7 text-[#d4af37] mb-1" />
                        <span className="text-[11px] text-gray-300 truncate w-full px-2">
                          {item.file.name}
                        </span>
                      </div>
                    )}

                    {/* Gradient Overlay for info readable */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 z-10">
                      <p className="text-[10px] text-gray-200 truncate font-medium">
                        {item.file.name}
                      </p>
                      <p className="text-[9px] text-gray-400">
                        {formatBytes(item.file.size)}
                      </p>
                    </div>

                    {/* Status Overlays */}
                    {item.status === "compressing" && (
                      <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1.5 z-20">
                        <LoaderIcon className="w-5 h-5 text-[#d4af37] animate-spin" />
                        <span className="text-[10px] text-[#d4af37] font-medium tracking-wide">
                          Optimizing...
                        </span>
                      </div>
                    )}

                    {item.status === "uploading" && (
                      <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1.5 z-20">
                        <LoaderIcon className="w-6 h-6 text-[#d4af37] animate-spin" />
                        <span className="text-[10px] text-[#d4af37] font-medium tracking-wide">
                          Uploading...
                        </span>
                      </div>
                    )}

                    {item.status === "success" && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1 z-20">
                        <CheckCircleIcon className="w-7 h-7 text-emerald-400" />
                        <span className="text-[10px] text-emerald-300 font-semibold">
                          Done
                        </span>
                      </div>
                    )}

                    {item.status === "error" && (
                      <div className="absolute inset-0 bg-red-950/80 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 text-center z-20">
                        <AlertCircleIcon className="w-5 h-5 text-red-400 mb-1" />
                        <span className="text-[9px] text-red-200 line-clamp-2 leading-tight">
                          {item.errorMsg || "Failed"}
                        </span>
                      </div>
                    )}

                    {/* Remove button (when idle or error) */}
                    {!isSubmitting && item.status !== "success" && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="absolute top-2 right-2 bg-black/70 hover:bg-red-500 rounded-full p-1.5 text-white shadow-md transition-colors z-30"
                        title="Remove file"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hidden multi-file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={config.accept}
            multiple={type !== "audio"}
            onChange={handleFileChange}
            className="hidden"
            id="file-input"
          />

          {/* Action buttons to add files */}
          {!isRecording && (
            <div className="flex gap-3">
              <label
                htmlFor="file-input"
                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border border-[#333] bg-[#111] hover:bg-[#161616] active:bg-[#202020] text-gray-200 transition-colors cursor-pointer text-sm font-medium"
              >
                {config.icon}
                {items.length > 0 ? "Add More Files" : "Choose Files"}
              </label>

              {(type === "photo" || type === "video") && (
                <>
                  <input
                    id="file-input-camera"
                    type="file"
                    accept={config.accept}
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-input-camera"
                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 hover:bg-[#d4af37]/20 text-[#d4af37] active:scale-95 transition-all cursor-pointer text-sm font-medium"
                  >
                    <CameraIcon className="w-5 h-5" />
                    {type === "photo" ? "Take Photo" : "Record Video"}
                  </label>
                </>
              )}

              {type === "audio" && items.length === 0 && (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 hover:bg-[#d4af37]/20 text-[#d4af37] active:scale-95 transition-all text-sm font-medium"
                >
                  <MicIcon className="w-5 h-5" />
                  Record Voice
                </button>
              )}
            </div>
          )}

          {/* Audio recording in progress UI */}
          {isRecording && (
            <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                <div className="w-6 h-6 rounded-full bg-red-500" />
              </div>
              <span className="text-[#d4af37] font-medium tracking-wide">Recording Voice Memo...</span>
              <button
                type="button"
                onClick={stopRecording}
                className="px-8 py-3 bg-red-500 text-white rounded-full font-medium active:scale-95 transition-transform shadow-lg shadow-red-500/20"
              >
                Stop & Save
              </button>
            </div>
          )}
        </div>
      )}

      {/* Text note textarea */}
      {type === "text" && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-400 tracking-wider uppercase">
            Write
          </label>
          <textarea
            value={note}
            disabled={isSubmitting}
            onChange={(e) => setNote(e.target.value)}
            rows={8}
            placeholder="What's on your mind..."
            className="w-full bg-[#111] border border-[#333] rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#d4af37] transition-colors resize-none font-serif text-lg leading-relaxed"
          />
        </div>
      )}

      {/* Caption for media */}
      {type !== "text" && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-400 tracking-wider uppercase">
            Caption <span className="normal-case text-gray-600">(optional)</span>
          </label>
          <textarea
            value={note}
            disabled={isSubmitting}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Add a shared memory note..."
            className="w-full bg-[#111] border border-[#333] rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#d4af37] transition-colors resize-none"
          />
        </div>
      )}

      {/* Global Status Feedback */}
      {globalStatus === "error" && (
        <div className="flex items-start gap-2.5 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl p-3.5 text-sm">
          <AlertCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">{globalError}</div>
        </div>
      )}

      {globalStatus === "success" && (
        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-xl p-3.5 text-sm">
          <CheckCircleIcon className="w-5 h-5 shrink-0" />
          <span>Memories saved successfully! Taking you back...</span>
        </div>
      )}

      {/* Submit / Retry button */}
      <button
        type="submit"
        disabled={isSubmitting || globalStatus === "success"}
        className="w-full py-4 bg-[#d4af37] text-black font-semibold rounded-xl hover:bg-[#c4a030] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base shadow-lg shadow-[#d4af37]/10"
      >
        {isSubmitting ? (
          <>
            <LoaderIcon className="w-5 h-5 animate-spin" />
            <span>
              {totalCount > 1
                ? `Saving (${completedCount + 1}/${totalCount})...`
                : "Saving memory..."}
            </span>
          </>
        ) : globalStatus === "error" && items.some((i) => i.status === "error") ? (
          <>
            <RotateCwIcon className="w-5 h-5" />
            <span>Retry Failed Uploads</span>
          </>
        ) : (
          <span>
            {items.length > 1 ? `Save ${items.length} Memories` : "Save Memory"}
          </span>
        )}
      </button>
    </form>
  )
}
