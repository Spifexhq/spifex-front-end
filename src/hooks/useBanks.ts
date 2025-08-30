// src/hooks/useBanks.ts
import { useEffect, useState } from 'react'
import { api } from 'src/api/requests'
import type { BankAccount } from '@/models/enterprise_structure/domain'

export const useBanks = (ids?: string[]) => {
  const [banks, setBanks] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBanks = async () => {
      setLoading(true)
      setError(null)
      try {
        if (ids && ids.length > 0) {
          const res = await api.getBanksBatch(ids)
          const list: BankAccount[] = Array.isArray(res.data) ? res.data : []
          setBanks(list.filter((b) => b && b.is_active))
        } else {
          const res = await api.getAllBanks()
          const list: BankAccount[] = res.data?.results ?? []
          setBanks(list.filter((b) => b && b.is_active))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao buscar bancos.')
        setBanks([])
      } finally {
        setLoading(false)
      }
    }

    fetchBanks()
  }, [ids])

  const toNum = (v: unknown) => {
    const n = Number(String(v ?? '0').replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }

  const totalConsolidatedBalance = banks.reduce((sum, b) => {
    return sum + toNum(b.consolidated_balance)
  }, 0)

  return { banks, totalConsolidatedBalance, loading, error }
}
