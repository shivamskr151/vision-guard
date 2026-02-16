import { useState, useEffect, useCallback } from 'react';

interface PaginationResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface UsePaginationOptions {
    limit?: number;
    initialPage?: number;
    extraParams?: Record<string, string | number | boolean | undefined>;
}

export function usePagination<T>(
    fetchUrl: string,
    options: UsePaginationOptions = {}
) {
    const { limit = 10, initialPage = 1, extraParams = {} } = options;

    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const fetchData = useCallback(async (page: number) => {
        setLoading(true);
        setError(null);
        try {
            const urlWithParams = new URL(fetchUrl);
            urlWithParams.searchParams.append('page', page.toString());
            urlWithParams.searchParams.append('limit', limit.toString());

            Object.entries(extraParams).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    urlWithParams.searchParams.append(key, value.toString());
                }
            });

            const response = await fetch(urlWithParams.toString());
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.statusText}`);
            }

            const result: PaginationResult<T> = await response.json();
            setData(result.data || []);
            setTotalPages(result.totalPages || 1);
            setTotalItems(result.total || 0);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
            console.error('Pagination fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [fetchUrl, limit, JSON.stringify(extraParams)]);


    useEffect(() => {
        fetchData(currentPage);
    }, [currentPage, fetchData]);

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const refresh = () => fetchData(currentPage);

    return {
        data,
        loading,
        error,
        currentPage,
        totalPages,
        totalItems,
        goToPage,
        refresh
    };
}
