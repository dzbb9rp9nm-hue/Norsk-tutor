import {keepAlive} from '../../server/keepalive.mjs';
// Scheduled functions have no public address; Netlify runs this on the schedule below.
export default async()=>{const result=await keepAlive();console.log('Supabase keep-alive',JSON.stringify(result));return new Response(null,{status:result.ok?204:502});};
export const config={schedule:'17 6 * * *'};
