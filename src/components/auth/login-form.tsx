"use client"

import { useState } from "react"
import Link from "next/link"
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
import { signInWithEmail, signInWithGoogle } from "@/firebase/auth-functions"
import { Loader2 } from "lucide-react"
import { doc, getDoc } from "firebase/firestore"

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
})

export function LoginForm({ dictionary, locale = 'en' }: { dictionary: Awaited<ReturnType<typeof getDictionary>>['auth'], locale?: string }) {
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
      const user = await signInWithEmail(auth, values.email, values.password)
      
      // Check user role in Firestore
      let userRole = 'user';
      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        userRole = userDocSnap.exists() ? userDocSnap.data()?.role : 'user';
      } catch (error) {
        console.error('Could not fetch user role from Firestore:', error);
        userRole = 'user';
      }
      
      toast({
        title: "Login Successful",
        description: `Welcome back, ${user.email}!`,
      })
      
      // Redirect based on role
      if (userRole === 'admin') {
        router.push(`/${locale}/admin`)
      } else {
        router.push(`/${locale}/dashboard`)
      }
    } catch (error: any) {
      console.error("Login error:", error)
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGoogleLogin() {
    if (!auth || !firestore) return

    try {
      setIsLoading(true)
      const user = await signInWithGoogle(auth, firestore)
      
      // Check user role in Firestore
      let userRole = 'user';
      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        userRole = userDocSnap.exists() ? userDocSnap.data()?.role : 'user';
      } catch (error) {
        console.error('Could not fetch user role from Firestore:', error);
        userRole = 'user';
      }
      
      toast({
        title: "Login Successful",
        description: `Welcome, ${user.displayName || user.email}!`,
      })
      
      // Redirect based on role
      if (userRole === 'admin') {
        router.push(`/${locale}/admin`)
      } else {
        router.push(`/${locale}/dashboard`)
      }
    } catch (error: any) {
      console.error("Google login error:", error)
      toast({
        title: "Login Failed",
        description: error.message || "An error occurred during Google login.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Google Login Button */}
      <Button 
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading || isUserLoading}
        variant="outline"
        className="w-full"
      >
        {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
        Sign in with Google
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
                <div className="flex items-center justify-between">
                  <FormLabel>{dictionary.passwordLabel}</FormLabel>
                  <Link
                    href={`/${locale}/reset-password`}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
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
            {dictionary.loginButton}
          </Button>
        </form>
      </Form>
    </div>
  )
}
