import { NodeOperationError } from 'n8n-workflow';
import type { INodeProperties } from 'n8n-workflow';

import { sendIfSet, setPath } from '../sendIfSet';

const show = { resource: ['image'], operation: ['create'] };

/** Operations and parameters for the Image resource. */
export const imageDescription: INodeProperties[] = [
	// Operations
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['image'],
			},
		},
		options: [
			{
				name: 'Archive Media',
				value: 'archiveMedia',
				action: 'Archive media item',
				description: 'Archive a saved image in the media library. Repeating this succeeds.',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1.0/images/media/{{$parameter["savedMediaId"]}}/archive',
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create image',
				description: 'Generate a standalone on-brand image from a text prompt',
				routing: {
					request: {
						method: 'POST',
						url: '/v1.0/images',
					},
				},
			},
			{
				name: 'Get Status',
				value: 'getStatus',
				action: 'Get image status',
				description: 'Poll an image generation until its status is completed or failed',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1.0/images/{{$parameter["imageGenerationId"]}}',
					},
				},
			},
		],
		default: 'create',
	},
	// Create
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
								setPath(requestOptions, 'body.referenceImages', rows.map((row) =>
									row.role ? { url: row.url, role: row.role } : { url: row.url },
								));
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
				routing: sendIfSet('imageAdditionalFields.sizePreset', 'body.sizePreset'),
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
				routing: sendIfSet('imageAdditionalFields.imageThemeId', 'body.themeId', { extractValue: true }),
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
				routing: sendIfSet('imageAdditionalFields.imageType', 'body.type'),
			},
		],
	},
	// Get Status
	{
		displayName: 'Image Generation ID',
		name: 'imageGenerationId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. imggen_abc123',
		description: 'The imageGenerationId returned when the image generation was created',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['getStatus'],
			},
		},
	},
	// Archive Media
	{
		displayName: 'Saved Media ID',
		name: 'savedMediaId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. media_abc123',
		description:
			'The savedMediaId from a completed image generation. Only images saved to the media library have one.',
		displayOptions: {
			show: {
				resource: ['image'],
				operation: ['archiveMedia'],
			},
		},
	},
];
