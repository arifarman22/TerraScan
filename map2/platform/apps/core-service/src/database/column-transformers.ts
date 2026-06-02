/**
 * Reusable TypeORM column transformers.
 */
import type { ValueTransformer } from 'typeorm';

/**
 * PostgreSQL `bigint` is returned by the driver as a string to avoid
 * precision loss; this transformer exposes it to the application as a number.
 */
export const bigintTransformer: ValueTransformer = {
  to: (value?: number | null): number | null | undefined => value,
  from: (value?: string | null): number =>
    value === null || value === undefined ? 0 : Number(value),
};
