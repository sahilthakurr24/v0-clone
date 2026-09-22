import { onboardUser } from "@/actions/getCurrent-user";
import { useAuth } from "@repo/auth/provider";

export default async function RootGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await onboardUser();

  return children;
}
