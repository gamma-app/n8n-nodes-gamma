import { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

/**
 * OAuth 2.0 authorisation-code credential for Gamma.
 *
 * Use this when the workflow should act on behalf of a Gamma *user* — each user
 * connects their own account and requests run in the workspace they pick,
 * spending their credits. For acting as yourself, the API key credential is
 * simpler.
 *
 * Register a client once with Gamma's dynamic client registration (no approval
 * needed), choosing a confidential client so n8n can authenticate with a secret:
 *
 *   curl -X POST https://auth.gamma.app/oauth/register \
 *     -H "Content-Type: application/json" \
 *     -d '{
 *       "client_name": "n8n",
 *       "redirect_uris": ["<the OAuth Redirect URL shown in n8n>"],
 *       "grant_types": ["authorization_code", "refresh_token"],
 *       "response_types": ["code"],
 *       "token_endpoint_auth_method": "client_secret_post"
 *     }'
 *
 * Then paste the returned client_id and client_secret below.
 */
export class GammaOAuth2Api implements ICredentialType {
	name = 'gammaOAuth2Api';
	extends = ['oAuth2Api'];
	displayName = 'Gamma OAuth2 API';
	documentationUrl = 'https://developers.gamma.app/get-started/authenticate-with-oauth';
	icon: Icon = 'file:icons/gamma.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://auth.gamma.app/oauth/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://auth.gamma.app/oauth/token',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'options',
			options: [
				{
					name: 'Generate (Full Access)',
					value: 'generate',
					description: 'Generations, edits, exports, themes and folders. Spends credits.',
				},
				{
					name: 'Read Only',
					value: 'gamma:read',
					description:
						'Gamma metadata only. Spends no credits and cannot reach generation endpoints.',
				},
			],
			default: 'generate',
			description: 'Request the narrowest scope your workflow needs',
		},
		{
			// RFC 8707 resource indicator. Gamma's docs call omitting this "the most
			// common integration mistake": without it the token's audience is wrong
			// and every API call fails, despite the flow appearing to succeed.
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'resource=https://public-api.gamma.app',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
