import { SharedTaxState, RegionType } from './taxCalculator';

// Encode state to URL search params
export function encodeStateToURL(state: SharedTaxState): string {
  const params = new URLSearchParams();

  params.set('gross', state.grossIncome.toString());
  if (state.declaredSalary) {
    params.set('declared', state.declaredSalary.toString());
  }
  params.set('dependents', state.dependents.toString());
  if (state.otherDeductions > 0) {
    params.set('deductions', state.otherDeductions.toString());
  }
  params.set('region', state.region.toString());
  if (state.pensionContribution > 0) {
    params.set('pension', state.pensionContribution.toString());
  }

  // Encode insurance options as binary flags: bhxh|bhyt|bhtn
  const insFlags = [
    state.insuranceOptions.bhxh ? '1' : '0',
    state.insuranceOptions.bhyt ? '1' : '0',
    state.insuranceOptions.bhtn ? '1' : '0',
  ].join('');
  if (insFlags !== '111') {
    params.set('ins', insFlags);
  }

  return params.toString();
}

// Decode URL search params to state
export function decodeStateFromURL(searchParams: string): Partial<SharedTaxState> | null {
  const params = new URLSearchParams(searchParams);

  // Check if there are any relevant params
  if (!params.has('gross')) {
    return null;
  }

  const state: Partial<SharedTaxState> = {};

  const gross = parseInt(params.get('gross') || '', 10);
  if (!isNaN(gross) && gross > 0) {
    state.grossIncome = gross;
  }

  const declared = parseInt(params.get('declared') || '', 10);
  if (!isNaN(declared) && declared > 0) {
    state.declaredSalary = declared;
  }

  const dependents = parseInt(params.get('dependents') || '', 10);
  if (!isNaN(dependents) && dependents >= 0) {
    state.dependents = dependents;
  }

  const deductions = parseInt(params.get('deductions') || '', 10);
  if (!isNaN(deductions) && deductions >= 0) {
    state.otherDeductions = deductions;
  }

  const region = parseInt(params.get('region') || '', 10) as RegionType;
  if ([1, 2, 3, 4].includes(region)) {
    state.region = region;
  }

  const pension = parseInt(params.get('pension') || '', 10);
  if (!isNaN(pension) && pension >= 0) {
    state.pensionContribution = pension;
  }

  // Decode insurance flags
  const insFlags = params.get('ins');
  if (insFlags && insFlags.length === 3) {
    state.insuranceOptions = {
      bhxh: insFlags[0] === '1',
      bhyt: insFlags[1] === '1',
      bhtn: insFlags[2] === '1',
    };
    state.hasInsurance = state.insuranceOptions.bhxh || state.insuranceOptions.bhyt || state.insuranceOptions.bhtn;
  }

  return Object.keys(state).length > 0 ? state : null;
}

// Generate full shareable URL
export function generateShareURL(state: SharedTaxState): string {
  const baseURL = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const params = encodeStateToURL(state);
  return params ? `${baseURL}?${params}` : baseURL;
}

// Copy to clipboard helper
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}
