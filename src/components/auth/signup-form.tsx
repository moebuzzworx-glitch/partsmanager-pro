"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { type getDictionary } from "@/lib/dictionaries"
import { useFirebase } from "@/firebase/provider"
import { signUpWithEmail, signInWithGoogle } from "@/firebase/auth-functions"
import { Loader2 } from "lucide-react"
import { GoogleIcon } from "@/components/icons/google-icon"

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
})

export function SignupForm({ dictionary, locale = 'en' }: { dictionary: Awaited<ReturnType<typeof getDictionary>>['auth'], locale?: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const { auth, firestore, isUserLoading } = useFirebase()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth || !firestore) return

    try {
      setIsLoading(true)
      await signUpWithEmail(auth, firestore, values.email, values.password)

      toast({
        title: "Signup Successful",
        description: "Check your email to verify your account.",
      })

      // Redirect to verification page
      router.push(`/${locale}/verify-email`)
    } catch (error: any) {
      console.error("Signup error:", error)
      toast({
        title: "Signup Failed",
        description: error.message || "An error occurred during signup.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGoogleSignup() {
    if (!auth || !firestore) return

    try {
      setIsLoading(true)
      const user = await signInWithGoogle(auth, firestore)

      toast({
        title: "Signup Successful",
        description: `Welcome, ${user.displayName || user.email}!`,
      })

      // Redirect to dashboard
      router.push(`/${locale}/dashboard`)
    } catch (error: any) {
      console.error("Google signup error:", error)
      toast({
        title: "Signup Failed",
        description: error.message || "An error occurred during Google signup.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Google Sign-up Button */}
      {/* Google Sign-up Button */}
      <Button
        type="button"
        onClick={handleGoogleSignup}
        disabled={isLoading || isUserLoading}
        variant="outline"
        className="w-full relative h-11 border-slate-200 hover:bg-slate-50 hover:text-slate-900 font-medium text-base transition-all active:scale-[0.98]"
      >
        {isLoading ? (
          <Loader2 className="me-2 h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon className="mr-2 h-5 w-5" />
        )}
        Sign up with Google
      </Button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
        </div>
      </div>

      {/* Email/Password Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dictionary.emailLabel}</FormLabel>
                <FormControl>
                  <Input placeholder="name@example.com" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{dictionary.passwordLabel}</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="********" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || isUserLoading}
          >
            {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {dictionary.signupButton}
          </Button>
        </form>
      </Form>
    </div>
  )
}
