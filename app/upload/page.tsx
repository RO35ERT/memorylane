import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import UploadForm from "./UploadForm"

export default async function UploadPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed] font-sans">
      <div className="max-w-2xl mx-auto px-4 pb-16 space-y-8">
        <div className="flex items-center gap-4 pt-8">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors p-2 -ml-2">
            ← Back
          </Link>
          <h1 className="text-3xl font-serif text-[#d4af37]">Add Memory</h1>
        </div>

        <section className="glass-panel p-6">
          <UploadForm />
        </section>
      </div>
    </main>
  )
}
