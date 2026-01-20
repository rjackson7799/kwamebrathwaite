import { createClient } from './client'
import { createClient as createServerClient } from './server'

// Client-side auth functions
export function getClientAuth() {
  const supabase = createClient()
  return supabase.auth
}

// Server-side auth functions
export async function getSession() {
  const supabase = await createServerClient()
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Error getting session:', error)
    return null
  }
  return session
}

export async function getUser() {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Error getting user:', error)
    return null
  }
  return user
}

export async function signIn(email: string, password: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export async function signOut() {
  const supabase = await createServerClient()
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Check if user is authenticated (for middleware/guards)
export async function isAuthenticated(): Promise<boolean> {
  const user = await getUser()
  return user !== null
}
