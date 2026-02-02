import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Qafela Admin Dashboard',
  description: 'Admin dashboard for managing Qafela app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}


