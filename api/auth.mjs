import { webHandler } from '../server/http.mjs';
import { authRequest } from '../server/auth.mjs';
export default webHandler(authRequest, 16384);
