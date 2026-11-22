import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { AppDataProvider } from "@/lib/data/app-context";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SystemBannerBar } from "@/components/SystemBannerBar";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-rubik",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "מתנת יום הולדת — פלטפורמה קהילתית לשיתוף הטבות יום הולדת",
    template: "%s | מתנת יום הולדת",
  },
  description:
    "פלטפורמה קהילתית חינמית לחיבור בין בעלי הטבות יום הולדת במועדוני לקוחות מאושרים לבין קונים בישראל — בלי העברת סיסמאות או קודים.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body className="antialiased flex flex-col min-h-screen text-[#241938]">
        <a href="#main-content" className="skip-link">
          דלג לתוכן הראשי
        </a>
        <AppDataProvider>
          <SystemBannerBar />
          <Navbar />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
        </AppDataProvider>
      </body>
    </html>
  );
}
