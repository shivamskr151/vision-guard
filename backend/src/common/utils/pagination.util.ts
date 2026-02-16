export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PaginationOptions {
    page?: number;
    limit?: number;
}

export async function paginate<T, R = T>(
    model: any,
    queryOptions: any = {},
    paginationOptions: PaginationOptions = { page: 1, limit: 10 },
    transform?: (data: T[]) => R[] | Promise<R[]>,
): Promise<PaginatedResult<R>> {
    const page = Number(paginationOptions.page) || 1;
    const limit = Number(paginationOptions.limit) || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        model.findMany({
            ...queryOptions,
            skip,
            take: limit,
        }),
        model.count({
            where: queryOptions.where,
        }),
    ]);

    const transformedData = transform ? await transform(data) : (data as unknown as R[]);

    return {
        data: transformedData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
}

