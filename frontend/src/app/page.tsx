'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredSession, loginWithHostedUI, handleAuthCallback } from '@/lib/auth'
import { Box, Container, Typography, Button, CircularProgress } from '@mui/material'
import { CloudQueue } from '@mui/icons-material'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const error = urlParams.get('error')

    if (error) {
      console.error('Authentication error:', error)
      setLoading(false)
      return
    }

    if (code) {
      // Handle OAuth callback
      handleAuthCallback(code)
        .then((session) => {
          // Store session and redirect to dashboard
          if (typeof window !== 'undefined') {
            localStorage.setItem('aws-inventory-session', JSON.stringify(session))
            router.push('/dashboard')
          }
        })
        .catch((err) => {
          console.error('Failed to handle auth callback:', err)
          setLoading(false)
        })
      return
    }

    // Check for existing session
    const session = getStoredSession()
    if (session && session.expiresAt > Date.now()) {
      router.push('/dashboard')
    } else {
      setLoading(false)
    }
  }, [router])

  const handleLogin = () => {
    loginWithHostedUI()
  }

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={3}
      >
        <CloudQueue sx={{ fontSize: 80, color: 'primary.main' }} />
        <Typography variant="h3" component="h1" gutterBottom>
          AWS Inventory Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center">
          Enterprise-grade AWS resource inventory and management
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={handleLogin}
          sx={{ mt: 2 }}
        >
          Sign In with SSO
        </Button>
      </Box>
    </Container>
  )
}

