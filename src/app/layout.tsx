// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Grafuz CRM — Marketing Agentlik Tizimi',
  description: 'Qurilish kompaniyalari uchun marketing agentlik boshqaruv platformasi',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  )
}
