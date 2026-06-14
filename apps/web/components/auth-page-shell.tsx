import Link from "next/link"
import { FileText } from "lucide-react"

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 self-center font-medium"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FileText className="size-4" />
          </span>
          Form Builder
        </Link>
        {children}
      </div>
    </main>
  )
}
