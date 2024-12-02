import _ from 'lodash';

const findColumnData = (source, columnId) => {
  return _.find(source, (item) => item.id === columnId);
};

export const mapItem = (columnData, itemName) => {
  let start = JSON.parse(findColumnData(columnData, 'date')?.value || '{}');
  delete start.changed_at;
  let end = JSON.parse(
    findColumnData(columnData, 'dup__of_start')?.value || '{}'
  );
  delete end.changed_at;

  return {
    name: itemName,
    cv: {
      dropdown3: {
        labels: [findColumnData(columnData, 'mirror0')?.display_value],
      }, // Account
      dup__of_account_name6: {
        labels: [findColumnData(columnData, 'mirror3')?.display_value],
      }, // Opportunity
      dup__of_account_name: {
        labels: [findColumnData(columnData, 'mirror81')?.display_value],
      }, // PID
      label_1: {
        label: findColumnData(columnData, 'dup__of_pid')?.text,
      }, // Pod
      status59: {
        labels: [findColumnData(columnData, 'dropdown')?.text],
      }, // Team
      dup__of_pod: {
        label: findColumnData(columnData, 'dup__of_pod9')?.text,
      }, // Shift
      label: {
        label: findColumnData(columnData, 'dup__of_pod')?.text,
      }, // Task
      numbers1: findColumnData(columnData, 'men__desplegable')?.text, // Frequency
      status: findColumnData(columnData, 'status')?.text, // Client
      texto_largo: findColumnData(columnData, 'text')?.text,
      people0: {
        personsAndTeams: JSON.parse(
          findColumnData(columnData, 'dup__of_cfm')?.value || '{}'
        )?.personsAndTeams,
      }, // CS
      dup__of_cs: {
        personsAndTeams: JSON.parse(
          findColumnData(columnData, 'person')?.value || '{}'
        )?.personsAndTeams,
      }, // CSM
      people: {
        personsAndTeams: JSON.parse(
          findColumnData(columnData, 'dup__of_cs')?.value || '{}'
        )?.personsAndTeams,
      }, // AS
      date: start, // Start Time date
      date_1: end, // End Time
    },
  };
};
