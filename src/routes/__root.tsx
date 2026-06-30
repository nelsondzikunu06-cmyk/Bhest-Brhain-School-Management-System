import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/hooks/use-theme";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-primary">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Page not found.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  if (typeof console !== "undefined") console.error("Root error boundary:", error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h2 className="font-display text-2xl text-foreground">Something went wrong</h2>
        <p className="mt-2 text-sm text-muted-foreground">An unexpected error occurred. Please try again.</p>
        <a href="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Reload</a>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Bhest Brhain Academy" },
      { name: "description", content: "Complete school management system - students, fees, attendance, grades." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Outlet />
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
