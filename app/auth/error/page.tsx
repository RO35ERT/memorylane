import Link from "next/link"

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const email = params.email as string | undefined;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex items-center justify-center p-4">
      <div className="glass-panel p-10 w-full max-w-md text-center space-y-6 border-[#500]">
        <div className="space-y-2">
          <h1 className="text-2xl font-serif text-red-400">Access Denied</h1>
          <p className="text-gray-400 text-sm">
            This memory lane is strictly private.
          </p>
          {email && (
            <p className="text-gray-300 text-sm mt-2">
              Your email <span className="font-semibold text-white">{email}</span> is not on the whitelist.
            </p>
          )}
        </div>
        
        <Link 
          href="/auth/signin"
          className="inline-block px-6 py-2 border border-[#333] hover:border-gray-400 rounded-full text-sm transition-colors"
        >
          Return to Sign In
        </Link>
      </div>
    </div>
  )
}
