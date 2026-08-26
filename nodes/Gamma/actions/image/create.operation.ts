import { NodeOperationError } from 'n8n-workflow';
import type { IDataObject, INodeProperties } from 'n8n-workflow';

const show = { resource: ['image'], operation: ['create'] };

/** Parameters for Image: Create. */
export const imageCreateDescription: INodeProperties[] = [
	{
		displayName: 'Prompt',
		name: 'imagePrompt',
		type: 'string',
		required: true,
		default: '',
		typeOptions: {
			rows: 3,
		},
		placeholder: 'e.g. A cyclist on a coastal road at sunrise',
		description: 'What the image should depict',
		displayOptions: { show },
		routing: {
			request: {
				body: {
					prompt: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Additional Options',
		name: 'imageAdditionalFields',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'Reference Images',
				name: 'referenceImages',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				description:
					'Images to guide the result. Supplying these makes Gamma skip a curated style and any theme, which it reports back as a warning.',
				options: [
					{
						displayName: 'Image',
						name: 'image',
						values: [
							{
								displayName: 'URL',
								name: 'url',
								type: 'string',
								default: '',
								placeholder: 'e.g. https://example.com/reference.png',
								description: 'Publicly reachable URL of the reference image',
							},
							{
								displayName: 'Role',
								name: 'role',
								type: 'options',
								options: [
									{ name: 'Subject', value: 'subject' },
									{ name: 'Unspecified', value: '' },
								],
								default: '',
								description: 'What the reference contributes. Subject marks it as the thing depicted.',
							},
						],
					},
				],
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('imageAdditionalFields.referenceImages', {}) as {
									image?: Array<{ url?: string; role?: string }>;
								};
								const rows = value.image ?? [];
								// No rows at all means the option simply is not in use.
								if (!rows.length) {
									return requestOptions;
								}
								// A row with a blank URL is a mistake, not an instruction to
								// send fewer references. Say so rather than dropping it.
								if (rows.some((row) => !row.url)) {
									throw new NodeOperationError(
										this.getNode(),
										'Every reference image needs a URL',
										{
											description:
												'Remove the empty rows under Reference Images, or fill in their URL.',
										},
									);
								}
								requestOptions.body = requestOptions.body || {};
								(requestOptions.body as IDataObject).referenceImages = rows.map((row) =>
									row.role ? { url: row.url, role: row.role } : { url: row.url },
								);
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Size Preset',
				name: 'sizePreset',
				type: 'options',
				options: [
					{ name: 'Banner', value: 'banner' },
					{ name: 'Slide', value: 'slide' },
					{ name: 'Social Portrait', value: 'social-portrait' },
					{ name: 'Social Square', value: 'social-square' },
					{ name: 'Story', value: 'story' },
				],
				default: 'slide',
				description: 'Aspect ratio and dimensions to generate at',
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('imageAdditionalFields.sizePreset') as string;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									(requestOptions.body as IDataObject).sizePreset = value;
								}
								return requestOptions;
							},
						],
					},
				},
			},
			{
				displayName: 'Theme',
				name: 'imageThemeId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				description:
					'Theme whose palette and style the image should follow. Ignored for some image types, which Gamma reports as a warning.',
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
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('imageAdditionalFields.imageThemeId', '', {
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
			{
				displayName: 'Type',
				name: 'imageType',
				type: 'options',
				options: [
					{ name: 'Abstract', value: 'abstract' },
					{ name: 'Illustration', value: 'illustration' },
					{ name: 'Photo', value: 'photo' },
					{ name: 'Scene', value: 'scene' },
				],
				default: 'photo',
				description: 'Kind of image to produce',
				routing: {
					send: {
						preSend: [
							async function (this, requestOptions) {
								const value = this.getNodeParameter('imageAdditionalFields.imageType') as string;
								if (value) {
									requestOptions.body = requestOptions.body || {};
									(requestOptions.body as IDataObject).type = value;
								}
								return requestOptions;
							},
						],
					},
				},
			},
		],
	},
];
