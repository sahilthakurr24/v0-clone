import { SignUp } from "@repo/auth/buttons";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <SignUp signInUrl="/signin" fallbackRedirectUrl="/" />
    </div>
  );
}
