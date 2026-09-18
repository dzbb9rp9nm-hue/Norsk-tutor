import {createAPI} from '../../server/api.mjs';
export default createAPI();
export const config={path:['/api/account/status','/api/account/sign-out','/api/account/records','/api/account/save','/api/account/tutor'],rateLimit:{windowLimit:120,windowSize:60,aggregateBy:['ip','domain']}};
