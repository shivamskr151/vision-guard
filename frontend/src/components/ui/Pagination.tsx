import React from 'react';
import styles from './Pagination.module.css';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    loading?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    loading = false,
}) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 7;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            // Always show first page
            pages.push(1);

            if (currentPage <= 4) {
                // Near beginning: 1 2 3 4 5 ... total
                for (let i = 2; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 3) {
                // Near end: 1 ... total-4 total-3 total-2 total-1 total
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) {
                    if (i > 1) pages.push(i);
                }
            } else {
                // Middle: 1 ... curr-1 curr curr+1 ... total
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    const pages = getPageNumbers();

    return (
        <div className={styles.pagination} role="navigation" aria-label="Pagination">
            <button
                type="button"
                className={styles.arrowBtn}
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                aria-label="Previous page"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>

            <div className={styles.pageGroup}>
                {pages.map((page, index) => (
                    <React.Fragment key={index}>
                        {page === '...' ? (
                            <span className={styles.ellipsis}>{page}</span>
                        ) : (
                            <button
                                type="button"
                                className={`${styles.pageNumber} ${currentPage === page ? styles.active : ''}`}
                                onClick={() => onPageChange(page as number)}
                                disabled={loading}
                                aria-current={currentPage === page ? 'page' : undefined}
                                aria-label={`Page ${page}`}
                            >
                                {page}
                            </button>
                        )}
                    </React.Fragment>
                ))}
            </div>

            <button
                type="button"
                className={styles.arrowBtn}
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
                aria-label="Next page"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </button>
        </div>
    );
};
