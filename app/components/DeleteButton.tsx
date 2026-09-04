"use client"

import { useState } from "react"
import { Trash2Icon, LoaderIcon, AlertTriangleIcon } from "lucide-react"
import { deleteMemory } from "../actions/deleteMemory"
import { useRouter } from "next/navigation"

export default function DeleteButton({ fileId }: { fileId: string }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteMemory(fileId)
      router.refresh()
      // We don't need to close the modal here because the component will unmount
      // or refresh automatically, but we can set it for safety
      setShowModal(false)
    } catch (err) {
      alert("Failed to delete memory. Please try again.")
      setIsDeleting(false)
      setShowModal(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={isDeleting}
        className="flex items-center gap-1.5 text-black/40 hover:text-red-500 transition-colors ml-auto disabled:opacity-50"
        title="Delete Memory"
      >
        {isDeleting ? <LoaderIcon size={18} className="animate-spin" /> : <Trash2Icon size={18} />}
      </button>

      {/* Custom Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-[#111] border border-[#333] w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center space-y-4">
            
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
              <AlertTriangleIcon size={24} />
            </div>
            
            <div>
              <h3 className="text-xl font-serif text-[#d4af37] mb-2">Delete Memory?</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                This will move the memory to your Google Drive Trash. You can recover it within 30 days.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full mt-4">
              <button
                onClick={() => setShowModal(false)}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl border border-[#333] text-gray-300 hover:bg-[#1a1a1a] transition-colors font-medium text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <><LoaderIcon size={16} className="animate-spin" /> Deleting...</>
                ) : (
                  "Yes, Delete"
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
