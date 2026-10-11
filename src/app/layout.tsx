import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "SAMVAD | Grievance Redressal Portal - School of Basic Sciences, CSJMU Kanpur",
  description:
    "Official manual grievance redressal portal for the School of Basic Sciences, Chhatrapati Shahu Ji Maharaj University (CSJMU), Kanpur. Multi-tier review: Course Coordinator, Department Head, Director.",
  keywords: [
    "SAMVAD",
    "CSJMU",
    "School of Basic Sciences",
    "Kanpur",
    "Grievance Redressal",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Geography",
    "Environmental Sciences",
  ],
  authors: [
    { name: "Harshit Gupta" },
    { name: "Anshika Soni" },
    { name: "School of Basic Sciences, CSJMU Kanpur" },
  ],
  creator: "Harshit Gupta and Anshika Soni (M.Sc Mathematics with AI and DS)",
  icons: {
    icon: "/assets/csjmu-emblem.png",
    shortcut: "/assets/csjmu-emblem.png",
    apple: "/assets/csjmu-emblem.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900">
        <Navbar />
        <main id="main-content" className="flex-1" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
