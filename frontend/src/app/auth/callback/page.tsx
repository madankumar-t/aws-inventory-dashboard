'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { handleAuthCallback } from '@/lib/auth'
import { Box, CircularProgress, Typography, Alert } from '@mui/material'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const code = searchParams.get('code')
    const errorParam = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (errorParam) {
      setError(errorDescription || errorParam)
      setLoading(false)
      return
    }

    if (!code) {
      setError('No authorization code received')
      setLoading(false)
      return
    }

    // Handle OAuth callback
    handleAuthCallback(code)
      .then((session) => {
        // Store session
        if (typeof window !== 'undefined') {
          localStorage.setItem('aws-inventory-session', JSON.stringify(session))
        }
        // Redirect to dashboard
        router.push('/dashboard')
      })
      .catch((err) => {
        console.error('Failed to handle auth callback:', err)
        setError(err.message || 'Failed to authenticate')
        setLoading(false)
      })
  }, [searchParams, router])

  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Completing authentication...
        </Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={2}
        p={3}
      >
        <Alert severity="error" sx={{ maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            Authentication Failed
          </Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '10px 20px',
            marginTop: '16px',
            cursor: 'pointer',
          }}
        >
          Return to Login
        </button>
      </Box>
    )
  }

  return null
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading...
          </Typography>
        </Box>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}

