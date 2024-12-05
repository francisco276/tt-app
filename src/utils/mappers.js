import { findColumnData } from './helpers';

// The next functions are just helpers for mapping punch board data
const findColumn =
  (fieldName, defaultValue = undefined, modifier = undefined) =>
  (columnData, columnId) => {
    const value =
      findColumnData(columnData, columnId)?.[fieldName] ?? defaultValue;

    return modifier && typeof modifier === 'function' ? modifier(value) : value;
  };
const getText = findColumn('text');
const getDisplayValue = findColumn('display_value');
const getValue = findColumn('value', '{}', JSON.parse);

/**
 * Maps column data into the format needed to create an item on the punch board
 * @param {Object} columnData
 * @param {String} itemName
 */
export const mapToPunchBoardFormat = (columnData) => {
  let start = getValue(columnData, 'date');
  delete start.changed_at;
  let end = getValue(columnData, 'dup__of_start');
  delete end.changed_at;

  return {
    dropdown3: {
      labels: [getDisplayValue(columnData, 'mirror0')],
    }, // Account
    dup__of_account_name6: {
      labels: [getDisplayValue(columnData, 'mirror3')],
    }, // Opportunity
    dup__of_account_name: {
      labels: [getDisplayValue(columnData, 'mirror81')],
    }, // PID
    label_1: {
      label: getText(columnData, 'dup__of_pid'),
    }, // Pod
    status59: {
      labels: [getText(columnData, 'dropdown')],
    }, // Team
    dup__of_pod: {
      label: getText(columnData, 'dup__of_pod9'),
    }, // Shift
    label: {
      label: getText(columnData, 'dup__of_pod'),
    }, // Task
    numbers1: getText(columnData, 'men__desplegable'), // Frequency
    status: getText(columnData, 'status'), // Client
    texto_largo: getText(columnData, 'text'),
    people0: {
      personsAndTeams: getValue(columnData, 'dup__of_cfm')?.personsAndTeams,
    }, // CS
    dup__of_cs: {
      personsAndTeams: getValue(columnData, 'person')?.personsAndTeams,
    }, // CSM
    people: {
      personsAndTeams: getValue(columnData, 'dup__of_cs')?.personsAndTeams,
    }, // AS
    date: start, // Start Time date
    date_1: end, // End Time
  };
};
