// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/theme-context'

export const metadata: Metadata = {
  title: 'Grafuz CRM — Marketing Agentlik Tizimi',
  description: 'Qurilish kompaniyalari uchun marketing agentlik boshqaruv platformasi',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
