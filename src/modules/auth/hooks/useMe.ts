"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/core/constants";
import { fetchMe } from "@/modules/auth/api";

export function useMe() {
  return useQuery({
    queryKey: QUERY_KEYS.me,
    queryFn: fetchMe,
    retry: false,
    staleTime: 60 * 1000,
  });
}
