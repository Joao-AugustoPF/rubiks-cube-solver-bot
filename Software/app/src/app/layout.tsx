import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const headingFont = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

const bodyFont = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const monoFont = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rubik's Cube Resolver Bot",
  description:
    "Base do projeto para modelagem de cubo 3x3, solução lógica e plano mecânico.",
};

const hydrationExtensionAttributeGuard = `
(function () {
  var attributeName = "inject_newsvd";
  var removeInjectedAttribute = function () {
    if (document.body && document.body.hasAttribute(attributeName)) {
      document.body.removeAttribute(attributeName);
    }
  };
  var observer = new MutationObserver(removeInjectedAttribute);
  var observeBody = function () {
    if (!document.body) {
      return false;
    }
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [attributeName]
    });
    removeInjectedAttribute();
    window.setTimeout(function () {
      observer.disconnect();
    }, 5000);
    return true;
  };

  removeInjectedAttribute();
  if (!observeBody()) {
    document.addEventListener("DOMContentLoaded", observeBody, { once: true });
    var documentObserver = new MutationObserver(function () {
      if (observeBody()) {
        documentObserver.disconnect();
      }
    });
    documentObserver.observe(document.documentElement, { childList: true });
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${headingFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
    >
      <body suppressHydrationWarning>
        <Script
          id="hydration-extension-attribute-guard"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: hydrationExtensionAttributeGuard }}
        />
        <a href="#main-content" className="skipLink">
          Pular para o conteúdo principal
        </a>
        <SiteHeader />
        <div className="app-content">{children}</div>
      </body>
    </html>
  );
}
