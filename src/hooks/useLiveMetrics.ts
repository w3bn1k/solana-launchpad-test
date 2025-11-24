import { useState, useEffect, useRef } from 'react';

export type ChangeDirection = 'up' | 'down' | 'same';

export const useLiveMetric = (value: any, updateInterval: number = 2000) => {
    const [displayValue, setDisplayValue] = useState(value);
    const [isUpdating, setIsUpdating] = useState(false);
    const [changeDirection, setChangeDirection] = useState<ChangeDirection>('same');
    const previousValue = useRef(value);
    const previousNumericValue = useRef<number | null>(null);

    const extractNumericValue = (val: any): number | null => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            const numericString = val.replace(/[^0-9.-]+/g, '');
            const num = parseFloat(numericString);
            return isNaN(num) ? null : num;
        }
        return null;
    };

    useEffect(() => {
        const currentNumeric = extractNumericValue(value);
        const prevNumeric = previousNumericValue.current;

        if (currentNumeric !== null && prevNumeric !== null && currentNumeric !== prevNumeric) {
            let direction: ChangeDirection = 'same';

            if (currentNumeric > prevNumeric) {
                direction = 'up';
            } else if (currentNumeric < prevNumeric) {
                direction = 'down';
            }

            setChangeDirection(direction);
            setIsUpdating(true);
            setDisplayValue(value);
            previousValue.current = value;
            previousNumericValue.current = currentNumeric;

            const timer = setTimeout(() => {
                setIsUpdating(false);
                setTimeout(() => setChangeDirection('same'), 1000);
            }, 600);

            return () => clearTimeout(timer);
        } else if (value !== previousValue.current) {
            setDisplayValue(value);
            previousValue.current = value;
            if (currentNumeric !== null) {
                previousNumericValue.current = currentNumeric;
            }
        }
    }, [value]);

    return { displayValue, isUpdating, changeDirection };
};