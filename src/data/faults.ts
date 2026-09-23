export type FaultType =
  | 'normal'
  | 'fluid_pound'
  | 'gas_interference'
  | 'stuck_pump'
  | 'tubing_leak'
  | 'pump_off'
  | 'gauge_anomaly'
  | 'comms_loss';

export interface FaultDef {
  label: string;
  short: string;
  component: string;
  defaultAction: string;
  rule: string;
}

export const FAULTS: Record<FaultType, FaultDef> = {
  normal: {
    label: 'Normal operation',
    short: 'Normal',
    component: '—',
    defaultAction: 'No action. Continue routine surveillance.',
    rule: 'All rule checks within configured bands',
  },
  fluid_pound: {
    label: 'Fluid pound',
    short: 'Fluid pound',
    component: 'Downhole pump / rod string',
    defaultAction: 'Adjust POC idle time and reduce stroke rate by 1 SPM',
    rule: 'Pump fillage < 75% for 3+ consecutive cycles AND sharp downstroke load drop',
  },
  gas_interference: {
    label: 'Gas interference',
    short: 'Gas interference',
    component: 'Downhole pump / gas separator',
    defaultAction: 'Open casing vent to flowline; evaluate gas anchor on next pull',
    rule: 'Casing pressure variance > 25% AND gradual downstroke unloading AND fillage < 70%',
  },
  stuck_pump: {
    label: 'Stuck pump',
    short: 'Stuck pump',
    component: 'Plunger / barrel',
    defaultAction: 'Dispatch crew; attempt unseat and flush, schedule pulling unit if unsuccessful',
    rule: 'Motor current spike > 40% AND stroke rate < 1 SPM AND load range < 30% of baseline',
  },
  tubing_leak: {
    label: 'Tubing leak',
    short: 'Tubing leak',
    component: 'Production tubing',
    defaultAction: 'Pressure test tubing; schedule workover if test fails',
    rule: 'Tubing pressure decline > 15% over 48h AND production decline with normal runtime',
  },
  pump_off: {
    label: 'Pump-off condition',
    short: 'Pump-off',
    component: 'Pump-off controller / reservoir inflow',
    defaultAction: 'Increase POC idle time; review setpoint against inflow rate',
    rule: 'Fillage < 55% AND runtime > 95% AND fluid level at pump intake',
  },
  gauge_anomaly: {
    label: 'Gauge anomaly',
    short: 'Gauge anomaly',
    component: 'Pressure transmitter / gauge',
    defaultAction: 'Verify transmitter calibration against field gauge; replace if drift confirmed',
    rule: 'CV gauge reading differs from telemetry by > 10% for 2+ inspections',
  },
  comms_loss: {
    label: 'Telemetry offline',
    short: 'RTU offline',
    component: 'RTU / radio link',
    defaultAction: 'Verify RTU power and radio link; confirm unit status on site',
    rule: 'No telemetry packets received for > 60 min',
  },
};
