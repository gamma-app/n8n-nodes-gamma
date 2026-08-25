import {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class GammaApi implements ICredentialType {
	name = 'gammaApi';
	displayName = 'Gamma API';
	documentationUrl = 'https://developers.gamma.app';
	icon: Icon = 'file:icons/gamma.svg';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your Gamma API key (starts with sk-gamma-)',
			placeholder: 'e.g. sk-gamma-xxxxxxxx',
		},
	];
	
	// Gamma uses X-API-KEY header for authentication
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-KEY': '={{$credentials.apiKey}}',
			},
		},
	};
	
	// Validated against /themes: it is documented, cheap, and returns 401 for a
	// bad key. Gamma publishes no /me endpoint, so don't test against one.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://public-api.gamma.app',
			url: '/v1.0/themes',
			method: 'GET',
		},
	};
}
