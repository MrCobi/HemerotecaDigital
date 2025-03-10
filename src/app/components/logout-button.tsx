"use client"

import { Button } from '@mui/material'
import { signOut } from 'next-auth/react'

const LogoutButton = () => {

    const handleClick = async () => {
        await signOut ({
            callbackUrl: '/'
        })
      }
  return (
   <Button variant='contained' onClick={handleClick}>Logout</Button>
  )
}

export default LogoutButton