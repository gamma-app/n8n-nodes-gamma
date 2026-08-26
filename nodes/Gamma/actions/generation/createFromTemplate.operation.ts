import type { IDataObject, INodeProperties } from 'n8n-workflow';

/** Parameters for Generation: Create from Template. */
export const createFromTemplateDescription: INodeProperties[] = [
	// ============================================
	// CREATE FROM TEMPLATE FIELDS
	// ============================================
	// Prompt (required for createFromTemplate)
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		required: true,
		typeOptions: {
			rows: 3,
		},
		default: '',
		placeholder: 'e.g. Remake this presentation for a technical audience',
		description: 'New prompt to regenerate the template with',
		displayOptions: {
			show: {
				resource: ['generation'],
				operation: ['createFromTemplate'],
			},
		},
		routing: {
			request: {
				body: {
					prompt: '={{ $value }}',
				},
			},
		},
	},
	// Gamma ID (required for createFromTemplate)
	{
		displayName: 'Gamma ID',
		name: 'gammaId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. file_abc123',
		description: 'File ID of the Gamma to use as template (must be single-page). Get from Gamma URL.',
		displayOptions: {
			show: {
				resource: ['generation'],
				operation: ['createFromTemplate'],
			},
		},
		routing: {
			request: {
				body: {
					gammaId: '={{ $value }}',
				},
			},
		},
	},
	// Theme ID for createFromTemplate
	{
		displayName: 'Theme',
		name: 'templateThemeId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		description: 'Optional theme override. Leave empty to keep the template theme.',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchThemes',
					searchable: true,
					searchFilterRequired: false,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				hint: 'Paste the ID from the Gamma app or from a List operation',
			},
		],
		displayOptions: {
			show: {
				resource: ['generation'],
				operation: ['createFromTemplate'],
			},
		},
		routing: {
			send: {
				preSend: [
					async function (this, requestOptions) {
						const value = this.getNodeParameter('templateThemeId', '', {
							extractValue: true,
						}) as string;
						if (value) {
							requestOptions.body = requestOptions.body || {};
							(requestOptions.body as IDataObject).themeId = value;
						}
						return requestOptions;
					},
				],
			},
		},
	},
];
