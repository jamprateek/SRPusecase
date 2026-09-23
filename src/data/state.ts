export type ActionStatus = 'New' | 'Open' | 'In progress' | 'Reviewed';

export interface ActionRecord {
  status: ActionStatus;
  ticket?: string;
  assignee?: string;
  updated?: string; // display time
}

export const INITIAL_ACTIONS: Record<string, ActionRecord> = {
  'TX-UPTON-030': { status: 'In progress', ticket: 'FT-24817', assignee: 'Crew 3 · R. Salinas', updated: 'Sep 23 05:12' },
  'TX-HOWARD-071': { status: 'Open', ticket: 'FT-24809', assignee: 'Crew 5 · M. Ortega', updated: 'Sep 22 17:48' },
  'TX-WARD-061': { status: 'In progress', ticket: 'FT-24821', assignee: 'Automation tech · J. Pruitt', updated: 'Sep 23 06:02' },
  'TX-GLASSCOCK-008': { status: 'Reviewed', updated: 'Sep 22 14:20' },
  'TX-WINKLER-046': { status: 'Open', ticket: 'FT-24798', assignee: 'Crew 2 · D. Nguyen', updated: 'Sep 22 09:31' },
};
