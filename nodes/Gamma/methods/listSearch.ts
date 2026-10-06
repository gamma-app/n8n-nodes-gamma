import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchResult,
} from 'n8n-workflow';

import { BASE_URL, USER_AGENT } from '../api';

/**
 * Backs the Theme and Folder pickers. Both endpoints share a shape:
 * `{ data: [{ id, name, ... }], hasMore, nextCursor }`, with `query` for search
 * and `after` for the cursor. Gamma caps `limit` at 50.
 */
async function searchWorkspaceResource(
	this: ILoadOptionsFunctions,
	url: string,
	filter?: string,
	paginationToken?: string,
	describe?: (item: IDataObject) => string | undefined,
): Promise<INodeListSearchResult> {
	const qs: IDataObject = { limit: 50 };
	if (filter) qs.query = filter;
	if (paginationToken) qs.after = paginationToken;

	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'gammaApi', {
		method: 'GET',
		baseURL: BASE_URL,
		url,
		qs,
		json: true,
		// Picker requests bypass the node's requestDefaults, so stamp the UA here too.
		headers: { 'User-Agent': USER_AGENT },
	})) as { data?: IDataObject[]; nextCursor?: string | null };

	return {
		results: (response.data ?? []).map((item) => ({
			name: (item.name as string) ?? (item.id as string),
			value: item.id as string,
			description: describe?.(item),
		})),
		// n8n stops paging when this is undefined; the API sends null at the end.
		paginationToken: response.nextCursor ?? undefined,
	};
}

/** Backs the Theme, Folder and Template resource-locator pickers. */
export const listSearch = {

	async searchThemes(
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		return await searchWorkspaceResource.call(
			this,
			'/v1.0/themes',
			filter,
			paginationToken,
			(item) => (item.type === 'custom' ? 'Custom workspace theme' : 'Standard theme'),
		);
	},

	async searchFolders(
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		return await searchWorkspaceResource.call(this, '/v1.0/folders', filter, paginationToken);
	},

	/**
	 * Workspace templates, then Gamma's official ones. The endpoint returns at
	 * most 25 of each and has no cursor, so there is no paging.
	 */
	async searchTemplates(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
		const qs: IDataObject = { limit: 25 };
		if (filter) qs.q = filter;
		const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'gammaApi', {
			method: 'GET',
			baseURL: BASE_URL,
			url: '/v1.0/templates/search',
			qs,
			json: true,
			headers: { 'User-Agent': USER_AGENT },
		})) as { workspaceTemplates?: IDataObject[]; exploreTemplates?: IDataObject[] };

		const toResult = (description: string) => (item: IDataObject) => ({
			name: (item.title as string) ?? (item.id as string),
			value: item.id as string,
			url: item.url as string,
			description,
		});
		return {
			results: [
				...(response.workspaceTemplates ?? []).map(toResult('Workspace template')),
				...(response.exploreTemplates ?? []).map(toResult('Gamma template')),
			],
		};
	},
};
