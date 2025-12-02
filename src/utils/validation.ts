import { ValidationError } from '../errors/PublicError';
import type { MondatColumnValue } from '../types'
import { findColumn } from './helpers';

const getDisplayValue = findColumn('display_value')

export const validateColumnDataForPunchBoard = (columnData: MondatColumnValue[]): boolean => {
  const account = getDisplayValue(columnData, 'mirror0')

  if (!account) {
    throw new ValidationError('monday.com hasn’t synced the data yet. Please try again in a moment. (Account)')
  }

  const opportunity = getDisplayValue(columnData, 'mirror3')
  if (!opportunity) {
    throw new ValidationError('monday.com hasn’t synced the data yet. Please try again in a moment. (Opportunity)')
  }

  const pid = getDisplayValue(columnData, 'mirror81')
  if (!pid) {
    throw new ValidationError('monday.com hasn’t synced the data yet. Please try again in a moment. (PID)')
  }

  return true
}