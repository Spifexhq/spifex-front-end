// src/hooks/useRequireLogin.ts
import { useSelector } from 'react-redux'
import { RootState } from '@/redux/rootReducer'
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export const useRequireLogin = (): boolean => {
  const isLogged = useSelector((s:RootState) => !!s.auth.user)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isLogged) {
      navigate('/signin', { replace: true, state: { from: location } })
    }
  }, [isLogged, navigate, location])

  return isLogged
}
