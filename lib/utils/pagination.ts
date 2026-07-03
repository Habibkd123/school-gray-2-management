import { Model } from "mongoose";

interface PaginateOptions {
  page?: number;
  limit?: number;
  sort?: Record<string, any>;
  populate?: any[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

/**
 * Paginates a mongoose model query using parallel count and fetch operations.
 * 
 * @param model Mongoose Model instance
 * @param query Find filters query object
 * @param options PaginateOptions configurations
 */
export async function paginateQuery<T>(
  model: Model<any>,
  query: Record<string, any>,
  options: PaginateOptions = {}
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, options.limit || 25);
  const skip = (page - 1) * limit;

  const countPromise = model.countDocuments(query);
  
  let findQuery = model.find(query)
    .sort(options.sort || { createdAt: -1 })
    .skip(skip)
    .limit(limit);

  if (options.populate && options.populate.length > 0) {
    options.populate.forEach((pop) => {
      findQuery = findQuery.populate(pop);
    });
  }

  const [items, total] = await Promise.all([
    findQuery.lean(),
    countPromise
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    items: items as unknown as T[],
    total,
    page,
    totalPages: Math.max(1, totalPages),
    limit
  };
}
