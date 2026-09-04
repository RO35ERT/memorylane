"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ImageIcon, VideoIcon, MicIcon, FileTextIcon, XIcon, CameraIcon, CheckCircleIcon, AlertCircleIcon, LoaderIcon } from "lucide-react"

type MemoryType = "photo" | "video" | "audio" | "text"
type Status = "idle" | "uploading" | "success" | "error"

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

export default function UploadForm() {
  const router = useRouter()
  const [type, setType] = useState<MemoryType>("photo")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [yearMonth, setYearMonth] = useState(new Date().toISOString().slice(0, 7))
  const [status, setStatus] = useState<Status>("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])

  const config = TYPE_CONFIG[type]

  const handleTypeChange = (t: MemoryType) => {
    setType(t)
    setFile(null)
    setPreview(null)
    setNote("")
    setStatus("idle")
    setErrorMsg("")
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
        setFile(audioFile)
        stream.getTracks().forEach((track) => track.stop())
        setIsRecording(false)
      })

      mediaRecorder.start()
      setIsRecording(true)
    } catch (e) {
      setErrorMsg("Microphone access denied or unavailable.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setStatus("idle")
    setErrorMsg("")
    if (selected.type.startsWith("image/") || selected.type.startsWith("video/")) {
      setPreview(URL.createObjectURL(selected))
    } else {
      setPreview(null)
    }
  }

  const clearFile = () => {
    setFile(null)
    setPreview(null)
    setStatus("idle")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (type !== "text" && !file) {
      setErrorMsg("Please select a file first.")
      setStatus("error")
      return
    }
    if (type === "text" && !note.trim()) {
      setErrorMsg("Please write something before saving.")
      setStatus("error")
      return
    }

    setStatus("uploading")
    setErrorMsg("")

    try {
      const formData = new FormData()

      if (type === "text") {
        // Create a .txt blob to send as file
        const blob = new Blob([note], { type: "text/plain" })
        formData.append("file", blob, `note_${Date.now()}.txt`)
      } else {
        formData.append("file", file!)
      }

      formData.append("caption", note)
      formData.append("yearMonth", yearMonth)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Upload failed.")
      }

      setStatus("success")
      // Navigate back to timeline after a short delay
      setTimeout(() => router.push("/"), 1500)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.")
      setStatus("error")
    }
  }

  const isSubmitting = status === "uploading"

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
          onChange={(e) => setYearMonth(e.target.value)}
          className="w-full bg-[#111] border border-[#333] rounded-xl p-3 text-white focus:outline-none focus:border-[#d4af37] transition-colors"
        />
      </div>

      {/* File picker */}
      {type !== "text" && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-400 tracking-wider uppercase">
            File
          </label>

          {preview && (
            <div className="relative rounded-xl overflow-hidden bg-[#111]">
              {type === "photo" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Preview" className="w-full max-h-72 object-cover" />
              )}
              {type === "video" && (
                <video src={preview} controls className="w-full max-h-72 rounded-xl" />
              )}
              <button
                type="button"
                onClick={clearFile}
                className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          {type === "audio" && file && (
            <div className="flex items-center gap-3 bg-[#111] rounded-xl p-4">
              <MicIcon className="w-5 h-5 text-[#d4af37]" />
              <span className="text-sm text-gray-300 truncate">{file.name}</span>
              <button type="button" onClick={clearFile} className="ml-auto text-gray-500">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={config.accept}
            onChange={handleFileChange}
            className="hidden"
            id="file-input"
          />

          {!file && !isRecording && (
            <div className="flex gap-3">
              <label
                htmlFor="file-input"
                className="flex-1 flex items-center justify-center gap-2 py-5 rounded-xl border border-[#333] text-gray-300 active:bg-[#1a1a1a] transition-colors cursor-pointer text-sm"
              >
                {config.icon}
                Library
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
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-5 rounded-xl border border-[#333] bg-[#111] text-[#d4af37] active:bg-[#1a1a1a] transition-colors cursor-pointer text-sm font-medium"
                  >
                    <CameraIcon className="w-5 h-5" />
                    {type === "photo" ? "Take Photo" : "Record Video"}
                  </label>
                </>
              )}
              {type === "audio" && (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-5 rounded-xl border border-[#333] bg-[#111] text-[#d4af37] active:bg-[#1a1a1a] transition-colors text-sm font-medium"
                >
                  <MicIcon className="w-5 h-5" />
                  Record Audio
                </button>
              )}
            </div>
          )}

          {isRecording && (
            <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                <div className="w-6 h-6 rounded-full bg-red-500" />
              </div>
              <span className="text-[#d4af37] font-medium tracking-wide">Recording...</span>
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
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Add a note..."
            className="w-full bg-[#111] border border-[#333] rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#d4af37] transition-colors resize-none"
          />
        </div>
      )}

      {/* Status feedback */}
      {status === "error" && (
        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl p-3 text-sm">
          <AlertCircleIcon className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}
      {status === "success" && (
        <div className="flex items-center gap-2 text-green-400 bg-green-400/10 border border-green-400/20 rounded-xl p-3 text-sm">
          <CheckCircleIcon className="w-4 h-4 shrink-0" />
          Memory saved! Taking you back...
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || status === "success"}
        className="w-full py-4 bg-[#d4af37] text-black font-semibold rounded-xl hover:bg-[#c4a030] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <LoaderIcon className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Memory"
        )}
      </button>
    </form>
  )
}
