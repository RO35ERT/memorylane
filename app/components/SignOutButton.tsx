"use client"

import { signOut } from "next-auth/react"
import { LogOutIcon } from "lucide-react"

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/auth/signin" })}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
    >
      <LogOutIcon className="w-3.5 h-3.5" />
      Sign out
    </button>
  )
}
