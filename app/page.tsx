import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import SignOutButton from "./components/SignOutButton"

export default async function Home() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000', color: '#fff', gap: '1rem' }}>
      <h1>Hello, {session.user?.name || session.user?.email}</h1>
      <p>Authentication is working!</p>
      <SignOutButton />
    </div>
  )
}
