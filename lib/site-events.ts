export type SiteEvent = 'cta_click' | 'form_start' | 'lead_saved' | 'diagnostic_started' | 'diagnostic_step_saved' | 'diagnostic_completed' | 'form_error';
/** Integration point only: no cookies, storage, remote requests or personal fields. */
export function emitSiteEvent(name: SiteEvent, detail: {channel?:string;step?:number} = {}) {
  if(typeof window!=='undefined') window.dispatchEvent(new CustomEvent('icbai:metric',{detail:{name,...detail}}));
}
