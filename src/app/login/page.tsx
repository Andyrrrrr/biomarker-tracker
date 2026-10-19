import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader, SiteMain } from "@/components/site-header";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <SiteHeader home="/login" />
      <SiteMain>
        <div className="mx-auto max-w-sm pt-16">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="pt-2 text-sm text-muted-foreground">We&apos;ll email you a code to sign in.</p>
          <Suspense>
            <LinkError searchParams={searchParams} />
          </Suspense>
          <LoginForm />
        </div>
      </SiteMain>
    </>
  );
}

async function LinkError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  if (error !== "link") return null;
  return (
    <p role="alert" className="pt-4 text-sm text-destructive">
      That sign-in link has expired or was already used, or was opened in a different browser. Ask for a new one.
    </p>
  );
}
