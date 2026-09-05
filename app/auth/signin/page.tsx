import { signIn, auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function SignInPage() {
  const session = await auth()
  if (session) redirect("/")

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center p-4">
      <div className="glass-panel p-10 w-full max-w-md text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-serif text-[#d4af37]">Memory Lane</h1>
          <p className="text-[#f0e1e1]/70 text-sm font-light">
            A private space for just the two of us.
          </p>
        </div>
        
        <form
          action={async () => {
            "use server"
            await signIn("google", { redirectTo: "/" })
          }}
        >
          <button 
            type="submit"
            className="w-full py-3 px-4 bg-[#1a1a1a] border border-[#333] hover:border-[#d4af37] rounded-lg transition-colors flex items-center justify-center space-x-3 group"
          >
            <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
            </svg>
            <span className="text-sm tracking-wide text-gray-200 group-hover:text-white transition-colors">
              Continue with Google
            </span>
          </button>
        </form>

        <p className="text-xs text-gray-500 pt-4">
          Access is restricted to authorized accounts only.
        </p>
      </div>
    </div>
  )
}
