import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "MTE Retail CRM",
  description: "Secure retail contact importing for More Than Energy",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
