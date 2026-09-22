import { SignIn } from "@repo/auth/buttons";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <SignIn signUpUrl="/signup" fallbackRedirectUrl="/" />
    </div>
  );
}
