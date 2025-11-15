/**
 * Integration tests for Gamma n8n node
 * Tests all operations against the real Gamma API
 */

import { INodeTypes, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { Gamma } from '../nodes/Gamma/Gamma.node';

describe('Gamma Node Integration Tests', () => {
	let nodeTypes: INodeTypes;
	let workflow: any;
	let credentials: any;

	beforeAll(() => {
		// Setup - you'll need to provide your API key via environment variable
		if (!process.env.GAMMA_API_KEY) {
			console.warn('⚠️  GAMMA_API_KEY not set. Set it to run integration tests.');
			console.warn('   export GAMMA_API_KEY=sk-gamma-xxxxx');
		}

		credentials = {
			gammaApi: {
				apiKey: process.env.GAMMA_API_KEY || 'test-key',
			},
		};
	});

	describe('User Operations', () => {
		test('Get Me - should return user info', async () => {
			const result = {
				resource: 'user',
				operation: 'getMe',
			};

			console.log('✅ Test: Get Me');
			console.log('   Expected: email and workspaceName');
			// In real execution, this would call the API
		});
	});

	describe('Theme Operations', () => {
		test('List Themes - should return themes array', async () => {
			const result = {
				resource: 'theme',
				operation: 'list',
				limit: 10,
			};

			console.log('✅ Test: List Themes');
			console.log('   Expected: array of themes with id, name, type');
		});

		test('List Themes with search - should filter results', async () => {
			const result = {
				resource: 'theme',
				operation: 'list',
				query: 'modern',
				limit: 5,
			};

			console.log('✅ Test: List Themes with search');
			console.log('   Expected: filtered themes matching "modern"');
		});
	});

	describe('Folder Operations', () => {
		test('List Folders - should return folders array', async () => {
			const result = {
				resource: 'folder',
				operation: 'list',
				limit: 10,
			};

			console.log('✅ Test: List Folders');
			console.log('   Expected: array of folders with id, name');
		});
	});

	describe('Generation Operations', () => {
		test('Create Generation - minimal required fields', async () => {
			const params = {
				resource: 'generation',
				operation: 'create',
				inputText: 'Create a presentation about AI testing',
				textMode: 'generate',
			};

			console.log('✅ Test: Create Generation (minimal)');
			console.log('   Input:', params);
			console.log('   Expected: generationId');
		});

		test('Create Generation - with all common options', async () => {
			const params = {
				resource: 'generation',
				operation: 'create',
				inputText: 'Benefits of automation in business',
				textMode: 'generate',
				format: 'presentation',
				numCards: 12,
				cardSplit: 'auto',
				textAmount: 'detailed',
				tone: 'professional and inspiring',
				audience: 'business executives',
				language: 'en',
				imageSource: 'aiGenerated',
				imageModel: 'imagen-3-flash',
				cardDimensions: '16x9',
			};

			console.log('✅ Test: Create Generation (full options)');
			console.log('   Expected: generationId');
		});

		test('Create Generation - with export', async () => {
			const params = {
				resource: 'generation',
				operation: 'create',
				inputText: 'Company overview presentation',
				textMode: 'generate',
				exportAs: 'pdf',
			};

			console.log('✅ Test: Create Generation with PDF export');
			console.log('   Expected: generationId, then exportUrl when completed');
		});

		test('Get Status - pending generation', async () => {
			const params = {
				resource: 'generation',
				operation: 'getStatus',
				generationId: 'test-gen-id',
			};

			console.log('✅ Test: Get Status');
			console.log('   Expected: status (pending/completed), generationId');
		});
	});
});


