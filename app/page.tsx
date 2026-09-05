export default async function Home() {
  // Let's test if Vercel can make outbound network requests at all
  let fetchResult = "Pending"
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const res = await fetch("https://accounts.google.com/.well-known/openid-configuration", {
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    fetchResult = res.ok ? "✅ SUCCESS: Vercel reached Google" : "❌ FAILED: HTTP Error"
  } catch (err) {
    fetchResult = `❌ ERROR: ${err instanceof Error ? err.message : String(err)}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000', color: '#fff', padding: 20, textAlign: 'center' }}>
      <h1>Network Diagnostic</h1>
      <p style={{ marginTop: 20, color: fetchResult.includes('SUCCESS') ? '#4ade80' : '#f87171' }}>
        {fetchResult}
      </p>
      <p style={{ marginTop: 20, color: '#aaa', fontSize: 14, maxWidth: 400 }}>
        NextAuth needs to fetch from this Google URL to initialize. If this says ERROR or Timeout, it means Vercel is blocking/dropping outbound traffic to Google APIs.
      </p>
    </div>
  )
}
