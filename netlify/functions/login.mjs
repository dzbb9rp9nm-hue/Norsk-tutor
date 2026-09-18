import {createAPI} from '../../server/api.mjs';
export default createAPI();
export const config={path:'/api/account/sign-in',rateLimit:{windowLimit:10,windowSize:60,aggregateBy:['ip','domain']}};
