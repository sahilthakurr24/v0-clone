import { onboardUser } from "@/actions/getCurrent-user";

export default async function RootGroupLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    await onboardUser();

    return children
}
