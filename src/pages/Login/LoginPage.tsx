// src/pages/LoginPage.tsx
import { useState } from "react"
import type { FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import LogoFull from "@/assets/icons/logo-full.png"

// White fields sit on the cream page; the border and focus ring use the brand green.
const fieldClass =
  "h-11 border-primary/25 bg-white focus-visible:border-primary focus-visible:ring-primary/20"

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      // Replace with your NestJS login call:
      // const res = await fetch("/api/auth/login", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   credentials: "include",
      //   body: JSON.stringify({ email, password }),
      // })
      // if (!res.ok) throw new Error("Invalid credentials")
      navigate("/dashboard")
    } catch {
      setError("Your email or password is incorrect. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-secondary px-6 py-12">
      <div className="w-full max-w-md">
        <img
          src={LogoFull}
          alt="Nursync"
          className="mx-auto mb-8 h-20 w-auto rounded-xl object-contain"
        />

        <div className="rounded-2xl border border-primary/10 bg-white/50 p-6 text-center sm:p-8">
          <h1 className="font-serif text-3xl font-medium tracking-tight text-primary">
            Sign in
          </h1>
          <p className="mt-3 text-sm text-primary/70">
            Enter your email and password to continue.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5 text-left">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-primary">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@school.edu.ph"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-primary">
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="rounded-sm text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${fieldClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-primary/70 hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="h-11 w-full bg-primary text-secondary hover:bg-primary/90"
            >
              {submitting ? "Logging in…" : "Log in"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
