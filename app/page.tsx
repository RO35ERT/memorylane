import { auth } from "@/lib/auth"

export default async function Home() {
  let authResult = "Pending..."
  
  try {
    // We wrap auth() in a 3-second timeout to see if it is deadlocking
    const authPromise = auth()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("auth() hung for more than 3 seconds!")), 3000)
    )
    
    const session = await Promise.race([authPromise, timeoutPromise])
    authResult = session ? `✅ Logged in as ${session.user?.name}` : "✅ Not logged in (auth finished successfully)"
  } catch (err) {
    authResult = `❌ ERROR: ${err instanceof Error ? err.message : String(err)}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000', color: '#fff', padding: 20, textAlign: 'center' }}>
      <h1>Auth Diagnostic</h1>
      <p style={{ marginTop: 20, color: authResult.includes('✅') ? '#4ade80' : '#f87171' }}>
        {authResult}
      </p>
    </div>
  )
}
