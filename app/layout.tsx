
import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
    title: "Feedback Desk AI",
    description: "A Feedback Platform",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
