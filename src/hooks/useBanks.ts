/* src/hooks/useBanks.ts */
import { useEffect, useState } from 'react'
import { api } from '@/api/requests2'
import type { Bank } from '@/models/enterprise_structure/domain'

export const useBanks = (ids?: number[]) => {
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBanks = async () => {
      setLoading(true)
      setError(null)

      try {
        /* -------------------- chamadas -------------------- */
        const res = ids && ids.length
          ? await api.getBank(ids)       // 1-ou-N ids
          : await api.getAllBanks()      // todos

        // res.data pode ser { bank } OU { banks }
        const payload = res.data as
          | { bank?: Bank; banks?: Bank[] }  // união leve

        const fetched = payload.banks
          ?? (payload.bank ? [payload.bank] : [])

        /* mantém só bancos ativos e definidos */
        setBanks(fetched.filter((b): b is Bank => !!b && b.bank_status))
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erro ao buscar bancos.',
        )
        setBanks([])
      } finally {
        setLoading(false)
      }
    }

    fetchBanks()
  }, [ids])

  /* cálculo à prova de buracos/NaN */
  const totalConsolidatedBalance = banks.reduce((sum, b) => {
    const v = Number(b.consolidated_balance ?? 0)
    return sum + (isFinite(v) ? v : 0)
  }, 0)

  return { banks, totalConsolidatedBalance, loading, error }
}
