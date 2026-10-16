/**
 * authModel.js — Authentication response mappers and typedefs.
 *
 * Maps backend AuthResponseDto:
 *   {
 *     tokenType: 'Bearer',
 *     accessToken: string,
 *     accessTokenExpiresOn: string,
 *     refreshToken: string,
 *     refreshTokenExpiresOn: string,
 *     user: AuthUserDto
 *   }
 * Into clean `{ tokens, user }` structures.
 */

import { userFromApi } from '../users/userModel';

/**
 * Maps login and refresh responses from the API to { tokens, user }.
 * @param {object} api - Raw AuthResponseDto
 * @returns {{ tokens: { tokenType: string, accessToken: string, accessTokenExpiresOn: string, refreshToken: string, refreshTokenExpiresOn: string }, user: import('../users/userModel').UserModel }}
 */
export function mapLoginResponse(api) {
  if (!api) {
    return {
      tokens: {
        tokenType: 'Bearer',
        accessToken: '',
        accessTokenExpiresOn: '',
        refreshToken: '',
        refreshTokenExpiresOn: '',
      },
      user: userFromApi(null),
    };
  }

  const tokens = {
    tokenType: api.tokenType || 'Bearer',
    accessToken: api.accessToken || '',
    accessTokenExpiresOn: api.accessTokenExpiresOn || '',
    refreshToken: api.refreshToken || '',
    refreshTokenExpiresOn: api.refreshTokenExpiresOn || '',
  };

  const user = userFromApi(api.user);

  return { tokens, user };
}
