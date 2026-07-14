import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LinkVaultProvider } from "@/lib/store";
import { AuthGate } from "@/components/AuthGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LinkVault — Personal Link Organizer",
  description:
    "Simpan, kategorikan, dan lacak link dari berbagai sumber agar tersusun rapi dan mudah dibuka kembali.",
};

// Apply saved theme before paint to avoid a flash of the wrong theme
const themeInit = `
(function(){
  try {
    var t = localStorage.getItem('linkvault:theme');
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full font-sans">
        <LinkVaultProvider>
          <AuthGate>{children}</AuthGate>
        </LinkVaultProvider>
      </body>
    </html>
  );
}
