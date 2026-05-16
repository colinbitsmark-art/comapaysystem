import { useMemo } from "react";
import { useGetCurrenciesQuery } from "../services/api";
import { buildCurrencyByCode } from "../utils/currencyAmountDisplay";

export function useCurrencyByCode() {
  const { data: currencies = [] } = useGetCurrenciesQuery();
  return useMemo(() => buildCurrencyByCode(currencies), [currencies]);
}
